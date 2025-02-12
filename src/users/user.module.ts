import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserEntity } from "./user.entity";
import { UserRepository } from "./user.repository";
import { DatabaseModule } from "../common/database";

@Module({
  imports: [DatabaseModule.forFeature([UserEntity])],
  controllers: [],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
