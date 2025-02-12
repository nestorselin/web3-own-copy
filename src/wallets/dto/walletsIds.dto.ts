import { ArrayNotEmpty, IsArray, IsUUID } from "class-validator";

export class WalletsIdsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("all", { each: true })
  walletIds: string[];
}
