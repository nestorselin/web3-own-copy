import { Injectable } from "@nestjs/common";
import { Keypair, PublicKey } from "@solana/web3.js";
import { DEFAULT_DECIMALS, PumpFunSDK } from "pumpdotfun-sdk";

@Injectable()
export class TradingService {
  private readonly slippageBasisPoints = 10000n; // 1 percent slippage
  private readonly priorityFees = { unitLimit: 500000, unitPrice: 500000 }; // todo dynamic
  constructor() {}

  async buyToken(
    sdk: PumpFunSDK,
    buyer: Keypair,
    target: PublicKey,
    buyAmount: bigint,
    slippage: bigint = this.slippageBasisPoints,
    fee: { unitLimit: number; unitPrice: number } = this.priorityFees,
  ): Promise<void> {
    console.log(
      `Buying ${target.toBase58()} from ${buyer.publicKey.toBase58()}`,
    );

    await sdk.buy(buyer, target, buyAmount, slippage, fee);
  }

  async sellToken(
    sdk: PumpFunSDK,
    target: PublicKey,
    buyer: Keypair,
    sellAmount: number,
    slippage: bigint = this.slippageBasisPoints,
    fee: { unitLimit: number; unitPrice: number } = this.priorityFees,
  ) {
    console.log(
      `Selling ${target.toBase58()} from ${buyer.publicKey.toBase58()}`,
    );

    const maxRetries = 5;
    const sellAmountBigInt = BigInt(
      Math.floor(sellAmount * Math.pow(10, DEFAULT_DECIMALS)),
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await sdk.sell(buyer, target, sellAmountBigInt, slippage, fee);
        break;
      } catch (error) {
        console.error(
          `Sell operation failed on attempt ${attempt}: ${error.message}`,
        );

        if (attempt === maxRetries) {
          console.error(
            `Sell operation failed after ${maxRetries} attempts. Aborting.`,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
}
