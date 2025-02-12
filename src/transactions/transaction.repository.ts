import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AbstractRepository } from "src/common/database";
import { EntityManager, Repository } from "typeorm";
import { TransactionEntity } from "./transaction.entity";

@Injectable()
export class TransactionRepository extends AbstractRepository<TransactionEntity> {
  constructor(
    @InjectRepository(TransactionEntity)
    TransactionRepository: Repository<TransactionEntity>,
    entityManager: EntityManager,
  ) {
    super(TransactionRepository, entityManager);
  }
}
