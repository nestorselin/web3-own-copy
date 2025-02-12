import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../common/database";
import { WalletEntity } from "../wallets/entities/wallet.entity";
import { TransactionEntity } from "../transactions/transaction.entity";

@Entity("users")
export class UserEntity extends BaseEntity<UserEntity> {
  @Column({
    unique: true,
  })
  telegramId: string;

  @Column()
  username: string;

  @Column({ nullable: true, default: null })
  referralCode: string;

  @Column({ nullable: true })
  refererId: string;

  @OneToMany(() => WalletEntity, (wallet) => wallet.user)
  wallets: WalletEntity[];

  @OneToMany(() => TransactionEntity, (transaction) => transaction.user)
  transactions: TransactionEntity[];

  @ManyToOne(() => UserEntity, (user) => user.referrals, { nullable: true })
  @JoinColumn({ name: "refererId" })
  referer: UserEntity;

  @OneToMany(() => UserEntity, (user) => user.referer)
  referrals: UserEntity[];
}
