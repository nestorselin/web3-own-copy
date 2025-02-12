import {
  IsArray,
  ArrayNotEmpty,
  IsUUID,
  IsBoolean,
  IsNumber,
} from "class-validator";

export class HeatWalletsDto {
  @IsBoolean()
  isFast: boolean;

  @IsNumber()
  numberCycles: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("all", { each: true })
  walletIds: string[];

  @IsNumber()
  fee: number;
}
