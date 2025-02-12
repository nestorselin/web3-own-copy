import { IsNotEmpty, IsString } from "class-validator";

export class PumpDto {
  @IsNotEmpty()
  @IsString()
  mint: string;
}
