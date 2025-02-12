import { Injectable, NotFoundException } from "@nestjs/common";
import { WalletRepository } from "../repositories/wallet.repository";
import {
  Connection,
  PublicKey,
  Keypair,
  VersionedTransaction,
} from "@solana/web3.js";
import { PumpFunSDK } from "pumpdotfun-sdk";
import { Wallet, AnchorProvider } from "@coral-xyz/anchor";
import { In } from "typeorm";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";
import { ClearSplDto } from "../dto/clear-spl.dto";
import { SolanaConnectionService } from "./solana-connection.service";

@Injectable()
export class SplService {
  private readonly connection: Connection;
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly solanaConnectionService: SolanaConnectionService,
  ) {
    this.connection = this.solanaConnectionService.getConnection();
  }

  async clearSpl(userId: string, clearSplDto: ClearSplDto) {
    const { walletIds } = clearSplDto;

    const wallets = await this.walletRepository.find({
      id: In(walletIds),
      isHeating: false,
      userId,
    });

    if (wallets.length !== walletIds.length) {
      throw new NotFoundException(
        `Some wallets could not be found or do not meet the specified criteria. Criteria: [Not Heating, User ID: ${userId}]`,
      );
    }

    const keyPairs = wallets.map((wallet) =>
      Keypair.fromSecretKey(bs58.decode(wallet.privateKey)),
    );

    for (const wallet of keyPairs) {
      console.log(
        `Starting processing for wallet ${wallet.publicKey.toBase58()}`,
      );
      const anchorWallet = new Wallet(wallet);
      const provider = new AnchorProvider(this.connection, anchorWallet, {
        commitment: "processed",
      });
      const sdk = new PumpFunSDK(provider);

      await this.sellSPLTokens(wallet, sdk);
    }

    return wallets;
  }

  async sellSPLTokens(wallet: Keypair, sdk: PumpFunSDK) {
    try {
      console.log(`Processing wallet: ${wallet.publicKey.toBase58()}`);

      const tokenAccounts = await this.getTokenAccounts(wallet.publicKey);
      for (const tokenAccountInfo of tokenAccounts) {
        const { tokenAccountPubkey, mintPubkey, tokenAmount } =
          this.decodeTokenAccountInfo(tokenAccountInfo);

        if (tokenAmount > 0) {
          await this.sellTokenFromAccount(
            wallet,
            tokenAccountPubkey,
            mintPubkey,
            sdk,
          );
        }
      }
    } catch (error) {
      console.error(
        `Error selling SPL tokens for wallet ${wallet.publicKey.toBase58()}:`,
        error,
      );
    }
  }

  private async getTokenAccounts(publicKey: PublicKey) {
    const response = await this.connection.getTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID,
    });
    return response.value;
  }

  private decodeTokenAccountInfo(tokenAccountInfo: any) {
    const tokenAccountPubkey = new PublicKey(tokenAccountInfo.pubkey);
    const tokenAccountData = AccountLayout.decode(
      tokenAccountInfo.account.data,
    );
    const tokenAmount = tokenAccountData.amount;
    const mintPubkey = new PublicKey(tokenAccountData.mint);

    return { tokenAccountPubkey, mintPubkey, tokenAmount };
  }

  private async sellTokenFromAccount(
    wallet: Keypair,
    tokenAccountPubkey: PublicKey,
    mintPubkey: PublicKey,
    sdk: PumpFunSDK,
  ): Promise<void> {
    const currentSPLBalance =
      await this.connection.getTokenAccountBalance(tokenAccountPubkey);

    console.log(
      "is balance non zero",
      this.isBalanceNonZero(currentSPLBalance),
    );
    if (this.isBalanceNonZero(currentSPLBalance)) {
      await this.sellWithSDK(wallet, mintPubkey, currentSPLBalance, sdk);
    }
  }

  private isBalanceNonZero(balance: any): boolean {
    return balance.value.uiAmount !== null && balance.value.uiAmount > 0;
  }

  private async sellWithSDK(
    wallet: Keypair,
    mintPubkey: PublicKey,
    balance: any,
    sdk: PumpFunSDK,
  ): Promise<void> {
    try {
      await sdk.sell(wallet, mintPubkey, BigInt(balance.value.amount), 100n, {
        unitLimit: 1000000,
        unitPrice: 1000000,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Curve is complete")
      ) {
        console.log("sellWithSDK  error instanceof");
        await this.swapSPLTokensJupiter(
          wallet,
          mintPubkey,
          BigInt(balance.value.amount),
          100n,
          250000,
          false,
        );
      } else {
        throw error;
      }
    }
  }

  async swapSPLTokensJupiter(
    wallet: Keypair,
    mintPubkey: PublicKey,
    amount: bigint,
    slippageBasisPoints: bigint,
    feeAdjusted: number,
    isBuy: boolean,
  ): Promise<void> {
    try {
      const quoteResponse = await this.getJupiterQuote(
        mintPubkey,
        amount,
        slippageBasisPoints,
        isBuy,
      );
      console.log("Jupiter API quote response:", quoteResponse);

      const swapResponse = await this.performJupiterSwap(
        quoteResponse,
        wallet,
        feeAdjusted,
      );
      console.log("Jupiter API swap response:", swapResponse);

      await this.executeSwapTransaction(wallet, swapResponse);
    } catch (error) {
      console.error(
        `Error selling tokens using Jupiter API for ${wallet.publicKey.toBase58()}:`,
        error,
      );
    }
  }

  private async getJupiterQuote(
    mintPubkey: PublicKey,
    amount: bigint,
    slippageBasisPoints: bigint,
    isBuy: boolean,
  ): Promise<any> {
    let input, output, amountAdjusted: bigint;
    if (isBuy) {
      //determine if we are buying or selling and adjust request values
      input = "So11111111111111111111111111111111111111112";
      output = mintPubkey.toBase58();
      amountAdjusted = amount;
    } else {
      input = mintPubkey.toBase58();
      output = "So11111111111111111111111111111111111111112";
      amountAdjusted = amount * BigInt(1_000_000);
    }
    const quoteEndpoint = `https://quote-api.jup.ag/v6/quote?inputMint=${input}&outputMint=${output}&amount=${amountAdjusted}&slippageBps=${slippageBasisPoints}`;
    console.log(`Requesting quote from Jupiter API: ${quoteEndpoint}`);
    return await (await fetch(quoteEndpoint)).json();
  }

  private async performJupiterSwap(
    quoteResponse: any,
    wallet: Keypair,
    feeAdjusted: number,
  ): Promise<any> {
    const swapEndpoint = "https://quote-api.jup.ag/v6/swap";
    const response = await fetch(swapEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: feeAdjusted,
      }),
    });
    return await response.json();
  }

  private async executeSwapTransaction(
    wallet: Keypair,
    swapResponse: any,
  ): Promise<void> {
    if (swapResponse.error) {
      throw new Error(`Jupiter API swap error: ${swapResponse.error}`);
    }

    const swapTransactionBuf = Buffer.from(
      swapResponse.swapTransaction,
      "base64",
    );
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    console.log("Deserialized swap transaction:", transaction);

    transaction.sign([wallet]);

    const latestBlockhash = await this.connection.getLatestBlockhash();
    const rawTransaction = transaction.serialize();
    const txid = await this.connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2,
    });
    await this.connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature: txid,
    });
    console.log(`Transaction successful: https://solscan.io/tx/${txid}`);
  }
}
