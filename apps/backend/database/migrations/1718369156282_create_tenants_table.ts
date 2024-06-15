import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'tenants';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 21).primary();
      table.string('name').notNullable();
      table.string('logo').nullable().defaultTo(null);

      table.timestamp('created_at');
      table.timestamp('updated_at');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
