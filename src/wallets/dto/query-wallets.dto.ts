import { IsNotEmpty, Max, Min } from "class-validator";
import { Transform } from "class-transformer";

export class QueryWalletDto {
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  @Min(1)
  page: number = 1;

  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  @Min(1)
  @Max(50)
  pageSize: number = 10;
}
