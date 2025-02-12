import { Entity, Column, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/database";
import { UserEntity } from "../../users/user.entity";

@Entity("wallets")
export class WalletEntity extends BaseEntity<WalletEntity> {
  @Column()
  publicKey: string;

  @Column()
  privateKey: string;

  @Column({ default: false })
  isMaster: boolean;

  @Column({ default: false })
  isHeating: boolean;

  @Column({ default: true })
  isVisible: boolean;

  @Column()
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.wallets)
  user: UserEntity;
}
