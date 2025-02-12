import { Entity, Column } from "typeorm";
import { BaseEntity } from "../common/database";

@Entity("subscriptions")
export class SubscriptionEntity extends BaseEntity<SubscriptionEntity> {
  @Column()
  intermediateWalletId: string;

  @Column()
  receiverWalletPublicKey: string;

  @Column({ nullable: true })
  generatedSubscriptionId: number;

  @Column({ default: "pending" })
  status: string;
}
