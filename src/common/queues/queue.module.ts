import { forwardRef, Module } from "@nestjs/common";
import { QueueService } from "./queue.service";
import { BullModule } from "@nestjs/bull";
import { WalletModule } from "../../wallets/wallet.module";
import { HeatWalletProcessor } from "./processors/heat-wallet.processor";
import * as process from "process";
import { ConfigService } from "@nestjs/config";

@Module({
  imports: [
    forwardRef(() => WalletModule),
    BullModule.registerQueue({
      name: process.env.HEAT_WALLET_QUEUE_NAME,
    }),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) =>
        configService.get("queueConfigs"),
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [QueueService, HeatWalletProcessor],
  exports: [QueueService],
})
export class QueueModule {}
