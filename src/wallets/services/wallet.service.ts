import { Injectable, NotFoundException } from "@nestjs/common";
import { WalletRepository } from "../repositories/wallet.repository";
import { WalletEntity } from "../entities/wallet.entity";
import { AddWalletsDto } from "../dto/add-wallets.dto";
import { HeatWalletsDto } from "../dto/heat-wallets.dto";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { PumpFunSDK } from "pumpdotfun-sdk";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { DeleteResult, In } from "typeorm";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import bs58 from "bs58";
import { CoinService } from "./coins.service";
import { DepositDto } from "../dto/deposit.dto";
import { WalletsIdsDto } from "../dto/walletsIds.dto";
import { ChangeNowService } from "./change-now.service";
import { SolanaConnectionService } from "./solana-connection.service";
import { TradingService } from "./trading.service";
import { OrderRepository } from "../repositories/order.repository";
import { ConfigService } from "@nestjs/config";
import { PurchaseDto } from "../dto/purchase.dto";
import { CreateWalletsDto } from "../dto/create-wallets.dto";
import { SellDto } from "../dto/sell.dto";
import { SplService } from "./spl.service";
import { TransactionService } from "../../transactions/transaction.service";
import { TransactionTypeEnum } from "../../transactions/enums/transaction-type.enum";
import { SubscriptionEntity } from "../../listener/subscription.entity";
import { ListenerService } from "../../listener/listener.service";
import { SubscriptionRepository } from "../../listener/subscription.repository";
import { OrderEntity } from "../entities/order.entity";
import { PayerDto } from "../dto/payer.dto";

@Injectable()
export class WalletService {
  private readonly connection: Connection;
  private readonly feeWallet: string;
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly orderRepository: OrderRepository,
    private readonly coinService: CoinService,
    private readonly changeNowService: ChangeNowService,
    private readonly solanaConnectionService: SolanaConnectionService,
    private readonly tradingService: TradingService,
    private readonly splService: SplService,
    private readonly configService: ConfigService,
    private readonly transactionService: TransactionService,
    private readonly listenerService: ListenerService,
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {
    this.connection = this.solanaConnectionService.getConnection();
    this.feeWallet = this.configService.get<string>("feeWallet");
  }

  async createMultiple(userId: string, createWalletsDto: CreateWalletsDto) {
    const wallets: WalletEntity[] = [];

    for (let i = 0; i < createWalletsDto.count; i++) {
      const keypair = Keypair.generate();
      const wallet = {
        userId,
        publicKey: keypair.publicKey.toBase58(),
        privateKey: bs58.encode(keypair.secretKey),
      };
      wallets.push(new WalletEntity(wallet));
    }

    return await this.walletRepository.save(wallets);
  }

  async addMultiple(userId: string, wallets: AddWalletsDto): Promise<void> {
    await Promise.all(
      wallets.wallets.map(async (w) => {
        const existingWallet = await this.walletRepository.findOne({
          where: [{ publicKey: w.publicKey, privateKey: w.privateKey, userId }],
        });

        if (!existingWallet) {
          const wallet: WalletEntity = new WalletEntity({ userId, ...w });
          await this.walletRepository.create(wallet);
        }
      }),
    );
  }

  async deleteMultiple(
    userId: string,
    deleteWalletsDto: WalletsIdsDto,
  ): Promise<DeleteResult> {
    const wallets = await this.walletRepository.find({
      id: In(deleteWalletsDto.walletIds),
      isHeating: false,
      userId,
    });

    if (wallets.length !== deleteWalletsDto.walletIds.length) {
      throw new NotFoundException(
        `Some wallets could not be found or do not meet the specified criteria. Criteria: [Not Heating, User ID: ${userId}]`,
      );
    }

    return await this.walletRepository.deleteMany({
      id: In(deleteWalletsDto.walletIds),
      userId,
    });
  }

  async findOne(id: string): Promise<WalletEntity> {
    return this.walletRepository.findOne({ where: { id } });
  }

  async heatWallets(userId: string, heatWalletsDto: HeatWalletsDto) {
    const { walletIds, isFast, numberCycles, fee } = heatWalletsDto;

    try {
      const mainWallet = await this.walletRepository.findOne({
        where: { userId, isMaster: true },
      });

      if (!mainWallet) {
        throw new NotFoundException(
          `Main wallet not found or does not meet the criteria. User ID: ${userId}`,
        );
      }

      try {
        await this.solanaConnectionService.sendSolToAddress(
          mainWallet.id,
          new PublicKey(this.feeWallet),
          fee,
        );
      } catch (e) {
        throw new Error(
          "Transaction failed while sending the fee from the Main wallet.",
        );
      }

      await this.transactionService.create({
        userId,
        coin: "SOL",
        amount: fee,
        type: TransactionTypeEnum.SYSTEM_FEE,
      });

      const wallets = await this.walletRepository.find({
        id: In(walletIds),
        userId,
      });

      console.log(`wallets fetched: ${wallets.length}`);

      if (!wallets.length) {
        throw new NotFoundException(
          `No wallets found for the provided wallet IDs.`,
        );
      }

      for (let cycle = 0; cycle < numberCycles; cycle++) {
        console.log(`Starting cycle ${cycle + 1} of ${numberCycles}`);

        const coinsList = await this.coinService.fetchAndPopulateCoinsList(
          wallets.length,
        );
        console.log(
          `Cycle ${cycle + 1}: coinsList fetched: ${coinsList.length} items`,
        );

        for (const wallet of wallets) {
          try {
            const coin = await this.getRandomCoin(coinsList);
            console.log(
              `Cycle ${cycle + 1}, Wallet ${wallet.id}: Coin selected: ${coin}`,
            );
            await this.doTrades(coin, wallet, isFast);
          } catch (error) {
            console.error(
              `Error processing wallet ${wallet.id} in cycle ${cycle + 1}: ${error.message}`,
            );
          }
        }

        console.log(`Cycle ${cycle + 1} completed.`);
      }

      await this.walletRepository.update(
        { id: In(walletIds) },
        { isHeating: false },
      );

      console.log(`Heating completed for all wallets.`);
      return wallets;
    } catch (error) {
      await this.walletRepository.update(
        { id: In(walletIds) },
        { isHeating: false },
      );
    }
  }
  async getSPLBalance(
    connection: Connection,
    mintAddress: PublicKey,
    pubKey: PublicKey,
    allowOffCurve: boolean = false,
  ): Promise<number> {
    try {
      let ata = getAssociatedTokenAddressSync(
        mintAddress,
        pubKey,
        allowOffCurve,
      );
      const balance = await connection.getTokenAccountBalance(ata, "processed");
      return balance.value.uiAmount;
    } catch (e) {
      return null;
    }
  }

  async doTrades(coin: string, wallet: WalletEntity, isFast: boolean) {
    const heatTime = isFast ? 3000 : 300000;

    const buyTimeout = Math.floor(Math.random() * heatTime);
    const sellTimeout = Math.floor(Math.random() * heatTime);
    const buyAmount = BigInt(Math.floor(Math.random() * 50000000) + 50000000);

    console.log(
      `Buy time:${buyTimeout}, Sell time:${sellTimeout}, Buy amount:${buyAmount}`,
    );

    const newBuyer = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
    const target = new PublicKey(coin);

    const mainWallet = new Wallet(Keypair.generate());
    const provider = new AnchorProvider(this.connection, mainWallet, {
      commitment: "processed",
      skipPreflight: true,
      preflightCommitment: "processed",
    });
    const sdk = new PumpFunSDK(provider);

    await new Promise((resolve) => setTimeout(resolve, buyTimeout)); // Wait before buying
    await this.tradingService.buyToken(sdk, newBuyer, target, buyAmount);

    await new Promise((resolve) => setTimeout(resolve, sellTimeout)); // Wait before selling

    const currentSPLBalance = await this.getSPLBalance(
      sdk.connection,
      target,
      newBuyer.publicKey,
    );
    if (currentSPLBalance) {
      await this.tradingService.sellToken(
        sdk,
        target,
        newBuyer,
        currentSPLBalance,
      );
    }
  }

  async deposit(userId: string, depositDto: DepositDto): Promise<any> {
    const { receiverWalletId, payers, fee } = depositDto;

    try {
      const [receiverWallet, mainWallet] = await Promise.all([
        this.findOne(receiverWalletId),
        this.walletRepository.findOne({ where: { userId, isMaster: true } }),
      ]);

      if (!mainWallet || !receiverWallet) {
        throw new NotFoundException(
          `Main Wallet or Receiver Wallet not found.`,
        );
      }

      const totalAmount = payers.reduce((sum, payer) => sum + payer.amount, 0);

      const keypair = Keypair.generate();
      const intermediateWallet = await this.walletRepository.create(
        new WalletEntity({
          userId,
          publicKey: keypair.publicKey.toBase58(),
          privateKey: bs58.encode(keypair.secretKey),
          isVisible: false,
        }),
      );

      const intermediateWalletPublicKey = keypair.publicKey.toBase58();

      //await this.deductSystemFee(mainWallet.id, fee, userId);

      const orderResponse = await this.changeNowService.createChangeNowOrder(
        intermediateWalletPublicKey,
        totalAmount,
      );

      if (!orderResponse) {
        throw new Error("Failed to create ChangeNow order.");
      }

      await this.processPayersInChunks(
        payers,
        receiverWallet.publicKey,
        intermediateWallet.id,
        intermediateWalletPublicKey,
        orderResponse.payinAddress,
      );

      const order = new OrderEntity({
        userId,
        externalOrderId: orderResponse.id,
      });
      await this.orderRepository.create(order);

      return orderResponse;
    } catch (e) {
      console.error(`Deposit failed: ${e.message}`);
      throw new Error(`Deposit failed: ${e.message}`);
    }
  }

  private async deductSystemFee(
    walletId: string,
    fee: number,
    userId: string,
  ): Promise<void> {
    await this.solanaConnectionService.sendSolToAddress(
      walletId,
      new PublicKey(this.feeWallet),
      fee,
    );

    await this.transactionService.create({
      userId,
      coin: "SOL",
      amount: fee,
      type: TransactionTypeEnum.SYSTEM_FEE,
    });
  }

  private async processPayersInChunks(
    payers: PayerDto[],
    receiverWalletPublicKey: string,
    intermediateWalletId: string,
    intermediateWalletPublicKey: string,
    payinAddress: string,
  ): Promise<void> {
    const CHUNK_SIZE = 5;

    for (let i = 0; i < payers.length; i += CHUNK_SIZE) {
      const chunk = payers.slice(i, i + CHUNK_SIZE);

      for (const payer of chunk) {
        try {
          const subscription = await this.createSubscription(
            receiverWalletPublicKey,
            intermediateWalletId,
          );

          await this.listenerService.subscribeToWallet(
            subscription.id,
            intermediateWalletPublicKey,
          );

          await this.solanaConnectionService.sendSolToAddress(
            payer.payerWalletId,
            new PublicKey(payinAddress),
            payer.amount,
          );
        } catch (e) {
          console.error(
            `Failed to process payer ${payer.payerWalletId}: ${e.message}`,
          );
        }
      }
    }
  }

  private async createSubscription(
    receiverWalletPublicKey: string,
    intermediateWalletId: string,
  ): Promise<SubscriptionEntity> {
    const subscription = new SubscriptionEntity({
      receiverWalletPublicKey,
      intermediateWalletId,
    });
    return await this.subscriptionRepository.create(subscription);
  }

  private async getRandomCoin(coinsList: string[]) {
    const randomIndex = Math.floor(Math.random() * coinsList.length);
    return coinsList[randomIndex];
  }

  async purchase(userId: string, purchaseDto: PurchaseDto): Promise<any> {
    const {
      targetMint,
      walletIds,
      buyAmount,
      randomAmount,
      slippage,
      buyFee,
      fee,
      delay,
      bonded,
    } = purchaseDto;

    try {
      const mainWallet = await this.walletRepository.findOne({
        where: { userId, isMaster: true },
      });

      if (!mainWallet) {
        throw new NotFoundException(
          `Main wallet not found or does not meet the specified criteria for User ID: ${userId}`,
        );
      }

      const wallets = await this.walletRepository.find({
        id: In(walletIds),
        userId,
      });

      if (wallets.length !== walletIds.length) {
        throw new NotFoundException(
          `Some wallets could not be found or do not meet the specified criteria for User ID: ${userId}`,
        );
      }

      const slippageBasisPoints = BigInt(slippage * 100);
      const feeAdjusted = Number(buyFee * 1e9);
      const isBuy = true;

      let buyMethod;
      if (!bonded) {
        const mainWalletKeyPair = new Wallet(Keypair.generate());
        const provider = new AnchorProvider(
          this.connection,
          mainWalletKeyPair,
          {
            commitment: "processed",
            skipPreflight: true,
            preflightCommitment: "processed",
          },
        );
        const sdk = new PumpFunSDK(provider);

        buyMethod = async (
          buyer: Keypair,
          targetMintKey: PublicKey,
          totalBuyAmount: bigint,
        ) => {
          await this.tradingService.buyToken(
            sdk,
            buyer,
            targetMintKey,
            totalBuyAmount,
            slippageBasisPoints,
            {
              unitLimit: feeAdjusted,
              unitPrice: feeAdjusted,
            },
          );
        };
      } else {
        buyMethod = async (
          buyer: Keypair,
          targetMintKey: PublicKey,
          totalBuyAmount: bigint,
        ) => {
          await this.splService.swapSPLTokensJupiter(
            buyer,
            targetMintKey,
            totalBuyAmount,
            slippageBasisPoints,
            feeAdjusted,
            isBuy,
          );
        };
      }

      const transactionResults = await Promise.all(
        wallets.map(async (wallet, index) => {
          await new Promise((resolve) => setTimeout(resolve, index * delay));
          try {
            const buyer = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
            const targetMintKey = new PublicKey(targetMint);

            const buyAmountBigInt = BigInt(Math.floor(buyAmount * 1e9));
            const randomAmountBigInt = BigInt(
              Math.floor(
                ((Math.random() * randomAmount) / 100) *
                  Number(buyAmountBigInt),
              ),
            );
            const totalBuyAmount = buyAmountBigInt + randomAmountBigInt;

            await buyMethod(buyer, targetMintKey, totalBuyAmount);

            return { walletId: wallet.id, status: "success" };
          } catch (error) {
            console.error(
              `Error processing purchase for wallet ${wallet.publicKey}:`,
              error,
            );
            return {
              walletId: wallet.id,
              status: "failed",
              error: error.message,
            };
          }
        }),
      );

      this.sendFeeTransaction(mainWallet.id, fee, userId).catch((error) => {
        console.error(`Error sending fee from main wallet: ${error.message}`);
      });

      const successCount = transactionResults.filter(
        (res) => res.status === "success",
      ).length;
      const failureCount = transactionResults.filter(
        (res) => res.status === "failed",
      ).length;

      console.log(
        `Purchase Summary: ${successCount} successful, ${failureCount} failed.`,
      );
      return transactionResults;
    } catch (error) {
      throw new Error(`Purchase process failed: ${error.message}`);
    }
  }

  async sell(userId: string, sellDto: SellDto): Promise<any> {
    const {
      targetMint,
      walletIds,
      sellAmount,
      slippage,
      sellFee,
      fee,
      bonded,
    } = sellDto;

    try {
      const mainWallet = await this.walletRepository.findOne({
        where: { userId, isMaster: true },
      });

      if (!mainWallet) {
        throw new NotFoundException(
          `Main wallet not found or does not meet the specified criteria for User ID: ${userId}`,
        );
      }

      const wallets = await this.walletRepository.find({
        id: In(walletIds),
        userId,
      });

      if (wallets.length !== walletIds.length) {
        throw new NotFoundException(
          `Some wallets could not be found or do not meet the specified criteria for User ID: ${userId}`,
        );
      }

      const slippageBasisPoints = BigInt(slippage * 100);
      const feeAdjusted = Number(sellFee * 1e9);
      const isBuy = false;

      let sellMethod;
      if (!bonded) {
        const mainWalletKeyPair = new Wallet(Keypair.generate());
        const provider = new AnchorProvider(
          this.connection,
          mainWalletKeyPair,
          {
            commitment: "processed",
            skipPreflight: true,
            preflightCommitment: "processed",
          },
        );
        const sdk = new PumpFunSDK(provider);

        sellMethod = async (buyer: Keypair, targetMintKey: PublicKey) => {
          await this.tradingService.sellToken(
            sdk,
            targetMintKey,
            buyer,
            sellAmount,
            slippageBasisPoints,
            {
              unitLimit: feeAdjusted,
              unitPrice: feeAdjusted,
            },
          );
        };
      } else {
        sellMethod = async (buyer: Keypair, targetMintKey: PublicKey) => {
          await this.splService.swapSPLTokensJupiter(
            buyer,
            targetMintKey,
            BigInt(Math.floor(sellAmount)), //round to avoid big int error
            slippageBasisPoints,
            feeAdjusted,
            isBuy,
          );
        };
      }

      const transactionResults = await Promise.all(
        wallets.map(async (wallet) => {
          try {
            const buyer = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
            const targetMintKey = new PublicKey(targetMint);

            await sellMethod(buyer, targetMintKey);

            return { walletId: wallet.id, status: "success" };
          } catch (error) {
            console.error(
              `Error processing sale for wallet ${wallet.publicKey}:`,
              error,
            );
            return {
              walletId: wallet.id,
              status: "failed",
              error: error.message,
            };
          }
        }),
      );

      this.sendFeeTransaction(mainWallet.id, fee, userId).catch((error) => {
        console.error(`Error sending fee from main wallet: ${error.message}`);
      });

      const successCount = transactionResults.filter(
        (res) => res.status === "success",
      ).length;
      const failureCount = transactionResults.filter(
        (res) => res.status === "failed",
      ).length;

      console.log(
        `Sell Summary: ${successCount} successful, ${failureCount} failed.`,
      );
      return transactionResults;
    } catch (error) {
      throw new Error(`Sell process failed: ${error.message}`);
    }
  }

  private async sendFeeTransaction(
    mainWalletId: string,
    fee: number,
    userId: string,
  ) {
    try {
      await this.solanaConnectionService.sendSolToAddress(
        mainWalletId,
        new PublicKey(this.feeWallet),
        fee,
      );
      console.log(`Fee successfully sent from main wallet.`);
      await this.transactionService.create({
        userId,
        coin: "SOL",
        amount: fee,
        type: TransactionTypeEnum.SYSTEM_FEE,
      });
    } catch (error) {
      console.error(`Error sending fee from main wallet: ${error.message}`);
    }
  }
}
