import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
} from "class-validator";
import { TransactionTypeEnum } from "../enums/transaction-type.enum";

export class SaveTransactionDto {
  @IsEnum(TransactionTypeEnum)
  @IsNotEmpty()
  type: TransactionTypeEnum;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  coin: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
