import { IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { AddWalletDto } from "./add-wallet.dto";

export class AddWalletsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddWalletDto)
  wallets: AddWalletDto[];
}
