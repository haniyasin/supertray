import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'users';

  async up() {
    this.schema
      .raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
      .raw('CREATE EXTENSION IF NOT EXISTS "citext"')
      .createTable(this.tableName, (table) => {
        table.string('id', 21).primary();
        table.string('first_name').notNullable();
        table.string('last_name').notNullable();
        table.specificType('email', 'CITEXT').unique().notNullable();
        table.string('passcode').nullable();
        table.dateTime('passcode_expires_at').nullable();
        table.enum('role', ['user', 'admin']).notNullable().defaultTo('user');
        table.timestamp('created_at');
        table.timestamp('updated_at');
      });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
