import { ArrayNotEmpty, IsArray, IsUUID } from "class-validator";

export class ClearSplDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("all", { each: true })
  walletIds: string[];
}
