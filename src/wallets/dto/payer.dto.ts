import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class PayerDto {
  @IsNotEmpty()
  @IsString()
  payerWalletId: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
