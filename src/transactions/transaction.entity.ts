import { Entity, Column, ManyToOne } from "typeorm";
import { BaseEntity } from "../common/database";
import { UserEntity } from "../users/user.entity";
import { TransactionTypeEnum } from "./enums/transaction-type.enum";

@Entity("transactions")
export class TransactionEntity extends BaseEntity<TransactionEntity> {
  @Column()
  type: TransactionTypeEnum;

  @Column({ type: "float" })
  amount: number;

  @Column()
  coin: string;

  @Column()
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.transactions)
  user: UserEntity;
}
