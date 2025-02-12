import { Injectable, NotFoundException } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { HttpService } from "@nestjs/axios";

@Injectable()
export class CoinService {
  private readonly pumpUrl = "https://frontend-api.pump.fun/coins";
  private readonly limit = 100;
  private readonly trashHold = 28;
  constructor(private readonly httpService: HttpService) {}
  async fetchAndPopulateCoinsList(amount: number): Promise<string[]> {
    const coinsList: string[] = [];
    let offset = this.getRandomOffset();

    while (coinsList.length < amount) {
      const coins = await this.getCoinsWithOffset(offset);
      if (!coins.length) break;

      coinsList.push(...coins);
      offset += this.limit;
    }

    return coinsList.slice(0, amount);
  }

  private async getCoinsWithOffset(offset: number): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.buildUrl(offset)),
      );
      return response.data
        .filter((coin: any) => coin.market_cap < this.trashHold)
        .map((coin: any) => coin.mint);
    } catch (error) {
      throw new NotFoundException(`Failed to fetch coin list`);
    }
  }

  private buildUrl(offset: number): string {
    return `${this.pumpUrl}?offset=${offset}&limit=${this.limit}&sort=created_timestamp&order=DESC&includeNsfw=true`;
  }

  private getRandomOffset(): number {
    return Math.floor(Math.random() * 900) + 100;
  }

  async getTokenInfo(mint: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.pumpUrl}/${mint}`),
      );
      return response.data;
    } catch (e) {
      throw new NotFoundException(`Coin could not be found`);
    }
  }
}
