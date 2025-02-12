import { WebSocketGateway, OnGatewayInit } from "@nestjs/websockets";
import { Injectable, Logger } from "@nestjs/common";
import * as WebSocket from "ws";
import { Connection, PublicKey } from "@solana/web3.js";
import { In, Not, LessThan } from "typeorm";
import { SolanaConnectionService } from "../wallets/services/solana-connection.service";
import { SubscriptionRepository } from "./subscription.repository";
import { ConfigService } from "@nestjs/config";
import { WalletRepository } from "../wallets/repositories/wallet.repository";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SubscriptionEntity } from "./subscription.entity";

@Injectable()
@WebSocketGateway()
export class ListenerService {
  private readonly wsRpcURL: string;
  private readonly logger = new Logger(ListenerService.name);
  private heliusWs: WebSocket | null = null;
  private readonly connection: Connection;
  constructor(
    private readonly configService: ConfigService,
    private readonly solanaConnectionService: SolanaConnectionService,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly walletRepository: WalletRepository,
  ) {
    this.wsRpcURL = this.configService.get<string>("wsRpcURL");
    this.connection = this.solanaConnectionService.getConnection();
  }

  private async connectHeliusWebSocket(): Promise<void> {
    if (this.heliusWs) {
      this.logger.log("WebSocket is already connected.");
      return;
    }

    try {
      this.heliusWs = new WebSocket(this.wsRpcURL);

      this.heliusWs.on("open", () => {
        this.logger.log("Connected to Helius WebSocket.");
      });

      this.heliusWs.on("message", async (data: string) => {
        try {
          const message = JSON.parse(data);
          await this.handleWebSocketMessage(message);
        } catch (error) {
          this.logger.error(
            `Error handling WebSocket message: ${error.message}`,
          );
        }
      });

      this.heliusWs.on("close", async () => {
        this.logger.warn("Helius WebSocket connection closed.");
        this.heliusWs = null;

        const activeSubscriptionExists = await this.checkActiveSubscriptions();
        if (activeSubscriptionExists) {
          this.logger.log(
            "Active subscriptions found. Reconnecting WebSocket...",
          );
          setTimeout(() => this.connectHeliusWebSocket(), 5000);
        }
      });

      this.heliusWs.on("error", (error) => {
        this.logger.error(`WebSocket error: ${error.message}`);
        this.heliusWs = null;
        setTimeout(() => this.connectHeliusWebSocket(), 5000);
      });
    } catch (error) {
      this.logger.error(
        `Failed to initialize WebSocket connection: ${error.message}`,
      );
      setTimeout(() => this.connectHeliusWebSocket(), 5000);
    }
  }

  async subscribeToWallet(
    subscriptionId: string,
    subscriptionWalletPublicKey: string,
  ): Promise<void> {
    await this.ensureWebSocketConnection();

    const subscriptionRequest = {
      jsonrpc: "2.0",
      id: subscriptionId,
      method: "accountSubscribe",
      params: [
        subscriptionWalletPublicKey,
        {
          commitment: "finalized",
          encoding: "base64",
        },
      ],
    };

    this.heliusWs?.send(JSON.stringify(subscriptionRequest));

    this.logger.log(
      `Subscription sent for wallet: ${subscriptionWalletPublicKey}`,
    );
  }

  private async ensureWebSocketConnection(): Promise<void> {
    if (this.heliusWs?.readyState === WebSocket.OPEN) return;

    if (!this.heliusWs || this.heliusWs.readyState === WebSocket.CLOSED) {
      this.logger.log("WebSocket is not open. Reconnecting...");
      await this.connectHeliusWebSocket();
    }

    await new Promise<void>((resolve) => {
      const checkReady = () => {
        if (this.heliusWs?.readyState === WebSocket.OPEN) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

  private async handleWebSocketMessage(message: any): Promise<void> {
    if (message.result && Number.isInteger(message.result) && message.id) {
      await this.handleSubscriptionResponse(message);
    } else if (message.method === "accountNotification") {
      await this.handleAccountNotification(message);
    } else {
      this.logger.warn(
        `Unhandled WebSocket message: ${JSON.stringify(message)}`,
      );
    }
  }

  private async handleSubscriptionResponse(message: any): Promise<void> {
    const { id, result } = message;
    if (!id || !result) return;

    try {
      await this.subscriptionRepository.update(
        { id: In([id]) },
        { generatedSubscriptionId: result },
      );

      this.logger.log(`Subscription updated with generated ID: ${result}`);
    } catch (error) {
      this.logger.error(`Failed to update subscription: ${error.message}`);
    }
  }

  private async handleAccountNotification(message: any): Promise<void> {
    const { params } = message;
    const generatedSubscriptionId = params?.subscription;
    const lamports = params?.result?.value?.lamports || 0;

    if (!generatedSubscriptionId || lamports === 0) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: { generatedSubscriptionId },
    });
    if (!subscription) {
      this.logger.warn(
        `No subscription found for ID: ${generatedSubscriptionId}`,
      );
      return;
    }

    const lamportsToSol = lamports / 1e9;
    const transferableBalance = (lamports - 5000) / 1e9;

    if (transferableBalance > 0.001) {
      this.logger.log(
        `Funds detected on wallet: ${lamportsToSol} SOL. Transferring ${transferableBalance} SOL.`,
      );

      try {
        await this.solanaConnectionService.sendSolToAddress(
          subscription.intermediateWalletId,
          new PublicKey(subscription.receiverWalletPublicKey),
          transferableBalance,
        );

        await this.subscriptionRepository.update(
          { intermediateWalletId: In([subscription.intermediateWalletId]) },
          { status: "completed" },
        );

        this.logger.log(
          `Funds sent and subscription completed: ${subscription.id}`,
        );
      } catch (error) {
        this.logger.error(`Failed to transfer funds: ${error.message}`);
        await this.subscriptionRepository.update(
          { id: In([subscription.id]) },
          { status: "failed" },
        );
      }
    } else {
      this.logger.warn(
        `Insufficient balance after fee deduction. Balance: ${lamportsToSol} SOL, Fee: 0.001 SOL.`,
      );

      await this.subscriptionRepository.update(
        { id: In([subscription.id]) },
        { status: "failed" },
      );
    }

    try {
      await this.unsubscribeFromWallet(generatedSubscriptionId);
      this.logger.log(
        `Unsubscribed from wallet: ${subscription.intermediateWalletId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from wallet: ${error.message}`);
    }
  }

  async unsubscribeFromWallet(subscriptionId: number): Promise<void> {
    if (!this.heliusWs) {
      throw new Error("Helius WebSocket is not connected.");
    }

    const unsubscribeRequest = {
      jsonrpc: "2.0",
      id: subscriptionId,
      method: "accountUnsubscribe",
      params: [subscriptionId],
    };

    this.heliusWs.send(JSON.stringify(unsubscribeRequest));
    this.logger.log(
      `Unsubscribe request sent for subscription ID: ${subscriptionId}`,
    );
  }

  private async checkActiveSubscriptions(): Promise<boolean> {
    try {
      const active = await this.subscriptionRepository.findOne({
        where: { status: "pending" },
      });
      return !!active;
    } catch (error) {
      this.logger.error(
        `Error checking active subscriptions: ${error.message}`,
      );
      return false;
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async deduct(): Promise<void> {
    try {
      const subscriptions = await this.subscriptionRepository.find({
        status: Not("completed"),
      });

      if (!subscriptions.length) {
        this.logger.log("No subscriptions found for deduction.");
        return;
      }

      const subscriptionsByWallet = subscriptions.reduce(
        (map, subscription) => {
          if (!map.has(subscription.intermediateWalletId)) {
            map.set(subscription.intermediateWalletId, []);
          }
          map.get(subscription.intermediateWalletId).push(subscription);
          return map;
        },
        new Map<string, SubscriptionEntity[]>(),
      );

      const walletIds = Array.from(subscriptionsByWallet.keys());

      const wallets = await this.walletRepository.find({
        id: In(walletIds),
      });

      for (const wallet of wallets) {
        try {
          const senderBalanceLamports = await this.solanaConnectionService
            .getConnection()
            .getBalance(new PublicKey(wallet.publicKey));
          const senderBalanceSol = senderBalanceLamports / 1e9;

          const walletSubscriptions =
            subscriptionsByWallet.get(wallet.id) || [];
          const subscription = walletSubscriptions[0];

          if (!subscription) {
            this.logger.warn(
              `No matching subscription found for wallet: ${wallet.publicKey}`,
            );
            continue;
          }

          if (senderBalanceSol < 0.001) {
            const subscriptionAge =
              Date.now() - new Date(subscription.createdAt).getTime();
            const oneDayInMillis = 24 * 60 * 60 * 1000;

            if (subscriptionAge > oneDayInMillis) {
              await this.subscriptionRepository.update(
                { intermediateWalletId: wallet.id },
                { status: "completed" },
              );
              this.logger.log(
                `Subscriptions for wallet ${wallet.publicKey} marked as completed due to insufficient balance and age > 1 day.`,
              );
            } else {
              this.logger.log(
                `No balance for wallet ${wallet.publicKey}, skipping...`,
              );
            }
            continue;
          }

          const transferableBalance = (senderBalanceLamports - 5000) / 1e9;

          if (transferableBalance > 0.001) {
            this.logger.log(
              `Transferring ${transferableBalance} SOL from wallet ${wallet.publicKey}`,
            );

            await this.solanaConnectionService.sendSolToAddress(
              wallet.id,
              new PublicKey(subscription.receiverWalletPublicKey),
              transferableBalance,
            );

            await this.subscriptionRepository.update(
              { intermediateWalletId: wallet.id },
              { status: "completed" },
            );

            this.logger.log(
              `Funds sent and subscriptions for wallet ${wallet.publicKey} marked as completed.`,
            );
          } else {
            this.logger.warn(
              `Insufficient transferable balance for wallet ${wallet.publicKey}.`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error processing wallet ${wallet.publicKey}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to deduct funds: ${error.message}`);
    }
  }
}
