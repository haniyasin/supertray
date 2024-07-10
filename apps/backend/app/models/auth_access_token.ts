import User from '#models/user';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

export default class AuthAccessToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare tokenableId: string;

  @column()
  declare type: 'auth_token';

  @column()
  declare name: string | null;

  @column()
  declare hash: string;

  @column()
  declare abilities: string[];

  @column()
  declare ipAddress: string | null;

  @column()
  declare userAgent: string | null;

  @column.dateTime()
  declare lastUsedAt: DateTime;

  @column.dateTime()
  declare expiresAt: DateTime;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => User, { foreignKey: 'tokenableId' })
  declare user: BelongsTo<typeof User>;
}
