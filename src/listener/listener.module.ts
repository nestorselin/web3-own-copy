import { forwardRef, Module } from "@nestjs/common";
import { ListenerService } from "./listener.service";
import { DatabaseModule } from "../common/database";
import { SubscriptionEntity } from "./subscription.entity";
import { SubscriptionRepository } from "./subscription.repository";
import { WalletModule } from "../wallets/wallet.module";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule.forFeature([SubscriptionEntity]),
    forwardRef(() => WalletModule),
  ],
  controllers: [],
  providers: [ListenerService, SubscriptionRepository],
  exports: [SubscriptionRepository, ListenerService],
})
export class ListenerModule {}
