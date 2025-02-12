import {
  DeleteResult,
  EntityManager,
  FindOneOptions,
  FindOptionsOrder,
  FindOptionsRelationByString,
  FindOptionsRelations,
  FindOptionsWhere,
  Repository,
  UpdateResult,
} from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { BaseEntity } from "./base.entity";

export abstract class AbstractRepository<T extends BaseEntity<T>> {
  constructor(
    public readonly itemsRepository: Repository<T>,
    private readonly entityManager: EntityManager,
  ) {}

  async create(entity: T): Promise<T> {
    return this.entityManager.save(entity);
  }

  async findOne(
    where: FindOneOptions<T>,
    relations?: FindOptionsRelations<T>,
  ): Promise<T | null> {
    const entity = await this.itemsRepository.findOne({
      ...where,
      ...(relations ? { relations } : {}),
    });

    if (!entity) {
      return null;
    }

    return entity;
  }

  async findOneAndUpdate(
    where: FindOptionsWhere<T>,
    partialEntity: QueryDeepPartialEntity<T>,
  ): Promise<T | null> {
    const updateResult = await this.itemsRepository.update(
      where,
      partialEntity,
    );

    if (!updateResult.affected) {
      return null;
    }

    return this.findOne({ where });
  }

  async find(where: FindOptionsWhere<T>): Promise<T[]> {
    return this.itemsRepository.find({ where });
  }

  async findAndCount(
    where: FindOptionsWhere<T>,
    page: number,
    pageSize: number,
    order?: FindOptionsOrder<T>,
    relations?: FindOptionsRelations<T> | FindOptionsRelationByString,
  ): Promise<[T[], number]> {
    return this.itemsRepository.findAndCount({
      where,
      ...(relations ? { relations } : {}),
      skip: pageSize * (page - 1),
      take: pageSize,
      ...(order ? { order } : {}),
    });
  }

  async findOneAndDelete(where: FindOptionsWhere<T>) {
    await this.itemsRepository.delete(where);
  }

  async save(entities: T[]): Promise<T[]> {
    return this.entityManager.save(entities);
  }

  async update(
    where: FindOptionsWhere<T>,
    partialEntity: QueryDeepPartialEntity<T>,
  ): Promise<UpdateResult> {
    return this.itemsRepository.update(where, partialEntity);
  }

  async deleteMany(where: FindOptionsWhere<T>): Promise<DeleteResult> {
    return this.itemsRepository.delete(where);
  }
}
