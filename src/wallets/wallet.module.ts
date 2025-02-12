import { forwardRef, Module } from "@nestjs/common";
import { DatabaseModule } from "../common/database";
import { WalletEntity } from "./entities/wallet.entity";
import { WalletService } from "./services/wallet.service";
import { WalletRepository } from "./repositories/wallet.repository";
import { WalletController } from "./wallet.controller";
import { QueueModule } from "../common/queues/queue.module";
import { CoinService } from "./services/coins.service";
import { OrderEntity } from "./entities/order.entity";
import { HttpModule } from "@nestjs/axios";
import { ChangeNowService } from "./services/change-now.service";
import { SplService } from "./services/spl.service";
import { SolanaConnectionService } from "./services/solana-connection.service";
import { TradingService } from "./services/trading.service";
import { OrderRepository } from "./repositories/order.repository";
import { PumpController } from "./pump.controller";
import { TransactionModule } from "../transactions/transaction.module";
import { ListenerModule } from "../listener/listener.module";

@Module({
  imports: [
    HttpModule,
    TransactionModule,
    DatabaseModule.forFeature([WalletEntity, OrderEntity]),
    forwardRef(() => QueueModule),
    forwardRef(() => ListenerModule),
  ],
  controllers: [WalletController, PumpController],
  providers: [
    WalletService,
    CoinService,
    ChangeNowService,
    SolanaConnectionService,
    SplService,
    TradingService,
    WalletRepository,
    OrderRepository,
  ],
  exports: [WalletService, WalletRepository, SolanaConnectionService],
})
export class WalletModule {}
