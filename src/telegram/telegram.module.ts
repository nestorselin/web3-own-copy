import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TelegramService } from "./telegram.service";
import { UserModule } from "../users/user.module";

@Module({
  imports: [AuthModule, UserModule],
  controllers: [],
  providers: [TelegramService],
})
export class TelegramModule {}
