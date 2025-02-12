import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { WalletRepository } from "../repositories/wallet.repository";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

@Injectable()
export class SolanaConnectionService {
  private readonly connection: Connection;

  constructor(
    private readonly configService: ConfigService,
    private readonly walletRepository: WalletRepository,
  ) {
    const rpcURL = this.configService.get<string>("rpcURL");
    this.connection = new Connection(rpcURL);
  }

  getConnection(): Connection {
    return this.connection;
  }

  async sendSolToAddress(
    fromWalletId: string,
    toPublicKey: PublicKey,
    amount: number,
  ) {
    const wallet = await this.walletRepository.findOne({
      where: { id: fromWalletId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet is not found`);
    }

    const senderKeypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderKeypair.publicKey,
          toPubkey: toPublicKey,
          lamports,
        }),
      );

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [senderKeypair],
        { commitment: "confirmed" },
      );
      console.log(`Transaction successful with signature: ${signature}`);
      return signature;
    } catch (error) {
      console.error(`Failed to send transaction:`, error);
      throw new Error("Transaction failed");
    }
  }

  async getWalletsWithBalances(userId: string) {
    const wallets = await this.walletRepository.find({
      userId,
      isVisible: true,
    });

    return await Promise.all(
      wallets.map(async (wallet) => {
        const publicKey = new PublicKey(wallet.publicKey);
        const splBalances = await this.getTokenAccountsAndBalances(publicKey);

        const solBalance =
          (await this.connection.getBalance(publicKey)) / 1000000000;
        return {
          id: wallet.id,
          isHeating: wallet.isHeating,
          isMaster: wallet.isMaster,
          publicKey: wallet.publicKey,
          solBalance,
          splBalances,
        };
      }),
    );
  }

  async getTokenAccountsAndBalances(
    walletPublicKey: PublicKey,
  ): Promise<Balance[]> {
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      { programId: TOKEN_PROGRAM_ID },
    );

    return tokenAccounts.value.map((accountInfo) => {
      const mint = accountInfo.account.data.parsed.info.mint;
      const balance =
        accountInfo.account.data.parsed.info.tokenAmount.amount / 1000000;

      return {
        mint,
        balance,
      };
    });
  }
}
