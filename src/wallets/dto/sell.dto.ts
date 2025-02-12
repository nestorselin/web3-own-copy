import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
export class SellDto {
  @IsNotEmpty()
  @IsString()
  targetMint: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("all", { each: true })
  walletIds: string[];

  @IsNotEmpty()
  @IsNumber()
  sellAmount: number;

  @IsNotEmpty()
  @IsNumber()
  slippage: number;

  @IsNotEmpty()
  @IsNumber()
  sellFee: number;

  @IsBoolean()
  bonded: boolean;

  @IsNumber() // our platform fee
  fee: number;
}
