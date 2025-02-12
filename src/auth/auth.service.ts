import { Injectable } from "@nestjs/common";
import { UserService } from "../users/user.service";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    telegramId: string,
    username: string,
    refererId?: string,
  ): Promise<string> {
    let user = await this.userService.findOne({ where: { telegramId } });

    if (!user) {
      user = await this.userService.create({ telegramId, username, refererId });
    }

    return this.jwtService.signAsync({
      telegramId,
      username,
      userId: user.id,
    });
  }
}
