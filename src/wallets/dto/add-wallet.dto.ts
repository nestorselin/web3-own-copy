import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class AddWalletDto {
  @IsNotEmpty()
  @IsString()
  publicKey: string;

  @IsNotEmpty()
  @IsString()
  privateKey: string;

  @IsOptional()
  isMaster?: boolean;
}
