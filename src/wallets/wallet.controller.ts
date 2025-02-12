import { UserDecorator } from "../common/decorators/user.decorator";
import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Post,
  UseGuards,
} from "@nestjs/common";
import { WalletService } from "./services/wallet.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AddWalletsDto } from "./dto/add-wallets.dto";
import { HeatWalletsDto } from "./dto/heat-wallets.dto";
import { QueueService } from "../common/queues/queue.service";
import { DepositDto } from "./dto/deposit.dto";
import { ClearSplDto } from "./dto/clear-spl.dto";
import { WalletsIdsDto } from "./dto/walletsIds.dto";
import { SplService } from "./services/spl.service";
import { SolanaConnectionService } from "./services/solana-connection.service";
import { PurchaseDto } from "./dto/purchase.dto";
import { CreateWalletsDto } from "./dto/create-wallets.dto";
import { SellDto } from "./dto/sell.dto";

@Controller("wallets")
@UseGuards(AuthGuard)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly splService: SplService,
    private readonly queueService: QueueService,
    private readonly solanaConnectionService: SolanaConnectionService,
  ) {}

  @Post("create-multi")
  async createMultiple(
    @Body() createWalletsDto: CreateWalletsDto,
    @UserDecorator() { userId }: { userId: string },
  ) {
    return await this.walletService.createMultiple(userId, createWalletsDto);
  }

  @Post("add-multi")
  async addMultiple(
    @Body() addWalletsDto: AddWalletsDto,
    @UserDecorator() { userId }: { userId: string },
  ) {
    return await this.walletService.addMultiple(userId, addWalletsDto);
  }

  @Delete("delete-multi")
  async deleteMultiple(
    @Body() deleteWalletsDto: WalletsIdsDto,
    @UserDecorator() { userId }: { userId: string },
  ) {
    return await this.walletService.deleteMultiple(userId, deleteWalletsDto);
  }

  @Post("heat")
  async heat(
    @Body() heatWalletsDto: HeatWalletsDto,
    @UserDecorator() { userId }: { userId: string },
  ) {
    try {
      await this.queueService.addHeatWalletJob(userId, heatWalletsDto);
      return { message: "Heating job has been added to the queue." };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "An error occurred while adding the heating job.",
      );
    }
  }

  @Post("deposit")
  async deposit(
    @Body() depositDto: DepositDto,
    @UserDecorator() { userId }: { userId: string },
  ) {
    return this.walletService.deposit(userId, depositDto);
  }

  @Post("clear-spl")
  async clearSpl(
    @Body() clearSplDto: ClearSplDto,
    @UserDecorator() { userId }: { userId: string },
  ) {
    return this.splService.clearSpl(userId, clearSplDto);
  }

  @Get()
  async getWalletsWithBalances(
    @UserDecorator() { userId }: { userId: string },
  ) {
    return this.solanaConnectionService.getWalletsWithBalances(userId);
  }

  @Post("purchase")
  async purchase(
    @Body() purchaseDto: PurchaseDto,
    @UserDecorator() { userId }: { userId: string },
  ) {
    return this.walletService.purchase(userId, purchaseDto);
  }

  @Post("sell")
  async sell(
    @Body() sellDto: SellDto,
    @UserDecorator() { userId }: { userId: string },
  ) {
    return this.walletService.sell(userId, sellDto);
  }
}
