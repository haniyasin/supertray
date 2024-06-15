import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'tenant_users';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 21).primary();

      table.string('tenant_id', 21).notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('user_id', 21).notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.enum('role', ['owner', 'admin', 'member']).notNullable().defaultTo('member');

      table.timestamp('created_at');
      table.timestamp('updated_at');

      table.unique(['tenant_id', 'user_id']);
      table.index(['tenant_id']);
      table.index(['user_id']);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
