interface Balance {
  mint: string;
  balance: number;
}

interface WalletBalances {
  publicKey: string;
  splBalances: Balance[];
}
