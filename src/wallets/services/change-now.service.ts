import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ChangeNowService {
  private readonly apiUrl = "https://api.changenow.io/v2/exchange";
  private readonly changeNowKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.changeNowKey = this.configService.get<string>("changeNowKey");
  }

  async createChangeNowOrder(receiverAddress: string, fromAmount: number) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.apiUrl,
          this.buildOrderPayload(receiverAddress, fromAmount),
          {
            headers: this.getRequestHeaders(),
          },
        ),
      );
      return response.data;
    } catch (error) {
      console.error("Error creating ChangeNow order:", error.message || error);
      return null;
    }
  }

  private buildOrderPayload(receiverAddress: string, fromAmount: number) {
    return {
      fromCurrency: "sol",
      toCurrency: "sol",
      fromNetwork: "sol",
      toNetwork: "sol",
      fromAmount,
      address: receiverAddress,
    };
  }

  private getRequestHeaders() {
    return {
      "Content-Type": "application/json",
      "x-changenow-api-key": this.changeNowKey,
    };
  }
}
