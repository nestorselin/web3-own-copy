import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { AbstractRepository } from "../common/database";
import { SubscriptionEntity } from "./subscription.entity";

@Injectable()
export class SubscriptionRepository extends AbstractRepository<SubscriptionEntity> {
  constructor(
    @InjectRepository(SubscriptionEntity)
    SubscriptionRepository: Repository<SubscriptionEntity>,
    entityManager: EntityManager,
  ) {
    super(SubscriptionRepository, entityManager);
  }
}
