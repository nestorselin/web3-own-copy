import { Body, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { PumpDto } from "./dto/pump.dto";
import { CoinService } from "./services/coins.service";

@Controller("pump")
@UseGuards(AuthGuard)
export class PumpController {
  constructor(private readonly coinService: CoinService) {}

  @Get()
  async getPump(@Query() pumpDto: PumpDto) {
    return this.coinService.getTokenInfo(pumpDto.mint);
  }
}
