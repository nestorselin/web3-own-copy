import {
  OnQueueActive,
  OnQueueError,
  OnQueueFailed,
  OnQueueStalled,
  Process,
  Processor,
} from "@nestjs/bull";
import { Job } from "bull";
import { Logger } from "@nestjs/common";
import { WalletService } from "../../../wallets/services/wallet.service";
import { HeatWalletsDto } from "../../../wallets/dto/heat-wallets.dto";
import { In } from "typeorm";
import { WalletRepository } from "../../../wallets/repositories/wallet.repository";

@Processor(process.env.HEAT_WALLET_QUEUE_NAME)
export class HeatWalletProcessor {
  private readonly logger = new Logger(HeatWalletProcessor.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly walletRepository: WalletRepository,
  ) {}

  @Process({ name: "heatWallets", concurrency: 1 })
  async handleHeatWalletsJob(
    job: Job<{ userId: string; heatWalletsDto: HeatWalletsDto }>,
  ) {
    this.logger.log(
      `Starting to process job ID: ${job.id} for user ID: ${job.data.heatWalletsDto.walletIds}`,
    );
    try {
      return await this.walletService.heatWallets(
        job.data.userId,
        job.data.heatWalletsDto,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process job ID: ${job.id} - Error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Job ID: ${job.id} is now active and being processed.`);
  }

  @OnQueueStalled()
  onStalled(job: Job) {
    this.logger.warn(
      `Job ID: ${job.id} has stalled. It may be retried automatically or require manual intervention.`,
    );
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: any) {
    await this.walletRepository.update(
      { id: In(job.data.heatWalletsDto.walletIds) },
      { isHeating: false },
    );
    this.logger.error(
      `Job ID: ${job.id} failed with error: ${error.message}`,
      error.stack,
    );
  }

  @OnQueueError()
  async onQueueError(job: Job, error: any) {
    await this.walletRepository.update(
      { id: In(job.data.heatWalletsDto.walletIds) },
      { isHeating: false },
    );
    this.logger.error(
      `An error occurred with the 'wallet-heat' queue: ${error.message}`,
      error.stack,
    );
  }
}
