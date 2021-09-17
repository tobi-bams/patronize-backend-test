import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class ExternalTransactions extends BaseSchema {
  protected tableName = 'external_transactions';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();
      table.string('external_reference').notNullable();
      table.integer('account_id').unsigned().references('accounts.id');
      table.decimal('amount', 20,4);
      table.string('status');
      table.enum('txn_type', ["Bank Funding", "Card Funding", "Transfer"]);
      table.string('third_party');
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
