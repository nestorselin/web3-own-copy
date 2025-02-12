import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../common/database";

@Entity("orders")
export class OrderEntity extends BaseEntity<OrderEntity> {
  @Column()
  externalOrderId: string;

  @Column()
  userId: string;
}
