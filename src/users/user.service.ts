import { Injectable } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { FindOneOptions } from "typeorm";
import { UserRepository } from "./user.repository";
import { UserEntity } from "./user.entity";

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  create(createUserDto: CreateUserDto) {
    const user: UserEntity = new UserEntity({
      ...createUserDto,
    });
    return this.userRepository.create(user);
  }

  findOne(
    findOneOption: FindOneOptions<UserEntity>,
  ): Promise<UserEntity | null> {
    return this.userRepository.findOne(findOneOption);
  }
}
