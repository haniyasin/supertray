import TenantUser from '#models/tenant_user';
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens';
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid';
import { compose } from '@adonisjs/core/helpers';
import hash from '@adonisjs/core/services/hash';
import { BaseModel, beforeCreate, column, computed, hasMany } from '@adonisjs/lucid/orm';
import type { HasMany } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import { nanoid } from 'nanoid';

const AuthFinder = withAuthFinder(() => hash.use('argon'), {
  uids: ['email'],
  passwordColumnName: 'passcode',
});

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare firstName: string;

  @column()
  declare lastName: string;

  @column()
  declare email: string;

  @column({ serializeAs: null })
  declare passcode: string | null;

  @column({ serializeAs: null })
  declare passcodeExpiresAt: DateTime | null;

  @column({ serializeAs: null })
  declare role: 'user' | 'admin';

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: false })
  declare updatedAt: DateTime | null;

  static accessTokens = DbAccessTokensProvider.forModel(User);

  @hasMany(() => TenantUser)
  declare tenants: HasMany<typeof TenantUser>;

  @beforeCreate()
  static setDefaultValues(user: User) {
    user.id = nanoid();
  }

  @computed()
  get displayName() {
    return `${this.firstName} ${this.lastName}`;
  }

  @computed({ serializeAs: null })
  get isAdmin() {
    return this.role === 'admin';
  }
}
