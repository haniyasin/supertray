import Tenant from '#models/tenant';
import User from '#models/user';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

export default class TenantUser extends BaseModel {
  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare tenantId: string;

  @column()
  declare userId: string;

  @column()
  declare role: 'owner' | 'admin' | 'member';

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>;

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;
}
