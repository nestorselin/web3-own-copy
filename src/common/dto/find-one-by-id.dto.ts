import { IsString, IsUUID } from "class-validator";

export class FindOneByIdDto {
  @IsUUID("4")
  id: string;
}
