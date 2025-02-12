import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { AbstractRepository } from "../../common/database";
import { WalletEntity } from "../entities/wallet.entity";

@Injectable()
export class WalletRepository extends AbstractRepository<WalletEntity> {
  constructor(
    @InjectRepository(WalletEntity)
    WalletRepository: Repository<WalletEntity>,
    entityManager: EntityManager,
  ) {
    super(WalletRepository, entityManager);
  }
}
