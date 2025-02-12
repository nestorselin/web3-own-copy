import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AbstractRepository } from "src/common/database";
import { EntityManager, Repository } from "typeorm";
import { UserEntity } from "./user.entity";

@Injectable()
export class UserRepository extends AbstractRepository<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    UserRepository: Repository<UserEntity>,
    entityManager: EntityManager,
  ) {
    super(UserRepository, entityManager);
  }
}
