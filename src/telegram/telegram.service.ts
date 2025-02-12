import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import * as TelegramBot from "node-telegram-bot-api";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "src/auth/auth.service";
import { UserService } from "../users/user.service";

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  onModuleInit(): void {
    const botToken = this.configService.get<string>("telegramBotToken");
    this.bot = new TelegramBot(botToken, { polling: true });
    this.logger.log("🤖 Telegram bot initialized and polling started.");
    this.registerCommands();
  }

  private registerCommands(): void {
    this.bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id?.toString();
      const username = msg.from?.username;

      if (!telegramId || !username) {
        return this.bot.sendMessage(
          chatId,
          "Unable to initiate login without a valid user ID and username.",
        );
      }

      try {
        const referralCode = match?.[1];
        let refererId: string | null = null;

        if (referralCode) {
          const referer = await this.userService.findOne({
            where: { referralCode },
          });
          refererId = referer?.id || null;
        }

        const token = await this.authService.login(
          telegramId,
          username,
          refererId,
        );

        const redirectLink = `/////////////////?username=${username}&login=${token}`;

        await this.bot.sendMessage(chatId, `🤠 Hello ${username}!`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🔗 Log in here",
                  url: redirectLink,
                },
              ],
            ],
          },
        });
      } catch (error) {
        this.logger.error("Error handling /start command:", error);
        await this.bot.sendMessage(
          chatId,
          "❌ An error occurred while processing your request. Please try again later.",
        );
      }
    });
  }
}
