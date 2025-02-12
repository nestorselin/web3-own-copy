import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { AbstractRepository } from "../../common/database";
import { OrderEntity } from "../entities/order.entity";

@Injectable()
export class OrderRepository extends AbstractRepository<OrderEntity> {
  constructor(
    @InjectRepository(OrderEntity)
    OrderRepository: Repository<OrderEntity>,
    entityManager: EntityManager,
  ) {
    super(OrderRepository, entityManager);
  }
}
