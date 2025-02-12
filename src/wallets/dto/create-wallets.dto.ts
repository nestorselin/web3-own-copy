import { IsNumber, Max, Min } from "class-validator";

export class CreateWalletsDto {
  @IsNumber()
  @Min(1)
  @Max(50)
  count: number;
}
