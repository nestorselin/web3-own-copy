import { Injectable, NotFoundException } from "@nestjs/common";
import { Queue } from "bull";
import { InjectQueue } from "@nestjs/bull";
import { HeatWalletsDto } from "../../wallets/dto/heat-wallets.dto";
import { In } from "typeorm";
import { WalletRepository } from "../../wallets/repositories/wallet.repository";

@Injectable()
export class QueueService {
  constructor(
    private readonly walletRepository: WalletRepository,
    @InjectQueue(process.env.HEAT_WALLET_QUEUE_NAME)
    public heatWalletQueue: Queue,
  ) {}

  async addHeatWalletJob(userId: string, heatWalletsDto: HeatWalletsDto) {
    const { walletIds } = heatWalletsDto;

    const wallets = await this.walletRepository.find({
      id: In(walletIds),
      isHeating: false,
      isMaster: false,
      userId,
    });

    if (wallets.length !== walletIds.length) {
      throw new NotFoundException(
        `Some wallets could not be found or do not meet the specified criteria. Criteria: [Not Master Wallets, Not Heating, User ID: ${userId}]`,
      );
    }

    await this.walletRepository.update(
      { id: In(walletIds) },
      { isHeating: true },
    );

    await this.heatWalletQueue.add("heatWallets", {
      userId,
      heatWalletsDto,
    });
  }
}
