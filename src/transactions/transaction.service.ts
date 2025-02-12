import { Injectable } from "@nestjs/common";
import { FindOneOptions } from "typeorm";
import { TransactionRepository } from "./transaction.repository";
import { TransactionEntity } from "./transaction.entity";
import { SaveTransactionDto } from "./dto/save-transaction.dto";

@Injectable()
export class TransactionService {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  create(saveTransactionDto: SaveTransactionDto) {
    const transaction: TransactionEntity = new TransactionEntity({
      ...saveTransactionDto,
    });
    return this.transactionRepository.create(transaction);
  }

  findOne(
    findOneOption: FindOneOptions<TransactionEntity>,
  ): Promise<TransactionEntity | null> {
    return this.transactionRepository.findOne(findOneOption);
  }
}
