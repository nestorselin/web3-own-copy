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
export class PurchaseDto {
  @IsNotEmpty()
  @IsString()
  targetMint: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("all", { each: true })
  walletIds: string[];

  @IsNotEmpty()
  @IsNumber()
  buyAmount: number;

  @IsNotEmpty()
  @IsNumber()
  randomAmount: number;

  @IsNotEmpty()
  @IsNumber()
  slippage: number;

  @IsNotEmpty()
  @IsNumber()
  buyFee: number;

  @IsNotEmpty()
  @IsNumber()
  delay: number;

  @IsBoolean()
  bonded: boolean;

  @IsNumber() // our platform fee
  fee: number;
}
