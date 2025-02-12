import { Module } from "@nestjs/common";
import { TransactionService } from "./transaction.service";
import { TransactionRepository } from "./transaction.repository";
import { DatabaseModule } from "../common/database";
import { TransactionEntity } from "./transaction.entity";

@Module({
  imports: [DatabaseModule.forFeature([TransactionEntity])],
  controllers: [],
  providers: [TransactionService, TransactionRepository],
  exports: [TransactionService],
})
export class TransactionModule {}
