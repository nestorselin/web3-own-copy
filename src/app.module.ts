import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./common/database";
import * as Joi from "joi";
import { configFile } from "./common/configs/config";
import { TelegramModule } from "./telegram/telegram.module";
import { AuthModule } from "./auth/auth.module";
import { WalletModule } from "./wallets/wallet.module";
import { UserModule } from "./users/user.module";
import { QueueModule } from "./common/queues/queue.module";
import { TransactionModule } from "./transactions/transaction.module";
import { ListenerModule } from "./listener/listener.module";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    TelegramModule,
    WalletModule,
    UserModule,
    ListenerModule,
    QueueModule,
    TransactionModule,
    ConfigModule.forRoot({
      envFilePath: ".env",
      isGlobal: true,
      load: [configFile],
      validationSchema: Joi.object({
        PORT: Joi.number().required(),
      }),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
