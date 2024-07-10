/* eslint-disable @typescript-eslint/no-explicit-any */
import db from '@adonisjs/lucid/services/db';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';
import type {
  LucidModel,
  LucidRow,
  ModelAttributes,
  ModelPaginatorContract,
  ModelQueryBuilderContract,
} from '@adonisjs/lucid/types/model';

export const errors = {
  NOT_FOUND: 'NOT_FOUND',
};

type ModelData<Model extends LucidModel> = ModelAttributes<InstanceType<Model>>;

const METHODS = {
  $ne: 'whereNot',
  $in: 'whereIn',
  $nin: 'whereNotIn',
  $or: 'orWhere',
  $and: 'andWhere',
} as const;

const OPERATORS = {
  $lt: '<',
  $lte: '<=',
  $gt: '>',
  $gte: '>=',
  $like: 'like',
  $notlike: 'not like',
  $ilike: 'ilike',
};

export type QueryProperty<T> = {
  $in?: T[];
  $nin?: T[];
  $lt?: T;
  $lte?: T;
  $gt?: T;
  $gte?: T;
  $ne?: T;
};

export type QueryProperties<O> = {
  [k in keyof O]?: O[k] | QueryProperty<O[k]>;
};

export type CrudQueryParams<O> = {
  $page?: number;
  $limit?: number;
  $select?: (keyof O)[];
  $sort?: { [k in keyof O]?: 1 | -1 };
  $or?: QueryProperties<O>[] | readonly QueryProperties<O>[];
  $and?: QueryProperties<O>[] | readonly QueryProperties<O>[];
  $transaction?: TransactionClientContract;
} & QueryProperties<O>;

const isObject = (value: any): value is object => typeof value === 'object' && value !== null && !Array.isArray(value);

export type CrudOptions = {
  /**
   * @default 'id'
   */
  idField: string;
  /**
   * @default []
   */
  defaultSelectFields: string[];
  /**
   * @default 25
   */
  defaultFindLimit: number;
  /**
   * @default 'createdAt'
   */
  defaultSortField: string;
  /**
   * @default 'desc'
   */
  defaultSortDirection: 'asc' | 'desc';
};

export class CrudService<
  Model extends LucidModel,
  IdType extends string | number,
  CreateData extends Partial<ModelData<Model>> = Partial<ModelData<Model>>,
  PatchData extends Partial<ModelData<Model>> = Partial<ModelData<Model>>,
  Params extends CrudQueryParams<ModelData<Model>> = CrudQueryParams<ModelData<Model>>,
> {
  Model: Model;
  options: CrudOptions = {
    idField: 'id',
    defaultSelectFields: [],
    defaultFindLimit: 25,
    defaultSortField: 'createdAt',
    defaultSortDirection: 'desc',
  };

  constructor(model: Model, options?: Partial<CrudOptions>) {
    this.Model = model;
    this.options = { ...this.options, ...options };
  }

  private knexifyQuery(
    queryBuilder: ModelQueryBuilderContract<Model, InstanceType<Model>>,
    query: { [key: string]: any } = {},
    parentKey?: string,
  ): ModelQueryBuilderContract<Model, InstanceType<Model>> {
    const knexify = this.knexifyQuery.bind(this);

    return Object.keys(query || {}).reduce<ModelQueryBuilderContract<Model, InstanceType<Model>>>(
      (currentQuery, key) => {
        const value = query[key];

        if (isObject(value)) {
          return knexify(currentQuery, value, key);
        }

        const column = parentKey || key;
        const method = METHODS[key as keyof typeof METHODS];

        if (method) {
          if (key === '$or' || key === '$and') {
            // This will create a nested query
            if (value) {
              currentQuery.where((qb: ModelQueryBuilderContract<Model, InstanceType<Model>>) => {
                for (const condition of value) {
                  const qbMethod = method as 'andWhere' | 'orWhere';
                  qb[qbMethod]((qb2: ModelQueryBuilderContract<Model, InstanceType<Model>>) => {
                    knexify(qb2, condition);
                  });
                }
              });
            }

            return currentQuery;
          }

          return currentQuery[method](column, value);
        }

        const operator = OPERATORS[key as keyof typeof OPERATORS] || '=';

        return operator === '=' ? currentQuery.where(column, value) : currentQuery.where(column, operator, value);
      },
      queryBuilder,
    );
  }

  private filterQuery(params?: Params) {
    const { $select, $sort, $limit = null, $page = 1, ...query } = params || ({} as Params);

    return {
      trx: params?.$transaction,
      filters: { $select, $sort, $limit, $page },
      query,
    };
  }

  private createQuery(params?: Params): ModelQueryBuilderContract<Model, InstanceType<Model>> {
    const { filters, query, trx } = this.filterQuery(params);
    const builder = this.Model.query({ client: trx });

    // $select uses a specific find syntax, so it has to come first.
    if (filters.$select) {
      const select = filters.$select.map((column) => String(column));
      // always select the id field, but make sure we only select it once
      builder.select(...new Set([...select, ...this.options.defaultSelectFields, this.options.idField]));
    } else {
      builder.select('*');
    }

    // build up the knex query out of the query params, include $and and $or filters
    this.knexifyQuery(builder, {
      ...query,
      // ..._.pick(filters, '$and', '$or')
    });

    // Handle $sort
    if (filters.$sort) {
      return Object.keys(filters.$sort).reduce(
        (currentQuery, key) => currentQuery.orderBy(key, (filters.$sort as any)[key] === 1 ? 'asc' : 'desc'),
        builder,
      );
    }

    return builder.orderBy(this.options.defaultSortField, this.options.defaultSortDirection);
  }

  async create(data: CreateData, options?: { $transaction?: TransactionClientContract }) {
    const model = new this.Model();
    model.fill(data);
    if (options?.$transaction) {
      model.useTransaction(options.$transaction);
    }
    return model.save();
  }

  async patch(id: IdType, data: PatchData) {
    const model = await this.Model.findBy(this.options.idField, id);
    if (!model) {
      throw new Error(errors.NOT_FOUND);
    }
    return model.merge(data);
  }

  async patchMany(params: Params, data: PatchData) {
    const { trx } = this.filterQuery(params);
    const transaction = trx || (await db.transaction());
    try {
      const builder = this.createQuery({
        ...params,
        $client: trx,
      });
      const models = await builder.where((qb) => {
        this.knexifyQuery(qb, params);
      });
      await Promise.all(models.map((model) => model.merge(data)));
      await transaction.commit();
      return models;
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  async delete(id: IdType) {
    const model = await this.Model.findBy(this.options.idField, id);
    if (!model) {
      throw new Error(errors.NOT_FOUND);
    }
    await model.delete();
    return {
      [this.options.idField]: id,
      deleted: true,
    };
  }

  async find(params: Params): Promise<ModelPaginatorContract<LucidRow & InstanceType<Model>>> {
    const { filters } = this.filterQuery(params);
    const builder = this.createQuery(params);
    const { defaultFindLimit } = this.options;
    const result = await builder.paginate(filters.$page, filters.$limit || defaultFindLimit);
    return result as ModelPaginatorContract<LucidRow & InstanceType<Model>>;
  }

  async get(id: IdType, params?: Params): Promise<InstanceType<Model>> {
    const model = await this.Model.query()
      .where(this.options.idField, id)
      .andWhere((qb) => {
        this.knexifyQuery(qb, params);
      })
      .first();
    if (!model) {
      throw new Error(errors.NOT_FOUND);
    }
    return model;
  }
}
