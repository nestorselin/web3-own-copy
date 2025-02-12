import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PayerDto } from "./payer.dto";

export class DepositDto {
  @IsNotEmpty()
  @IsString()
  receiverWalletId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayerDto)
  payers: PayerDto[];

  @IsNumber()
  fee: number;
}
