import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class Transactions extends BaseSchema {
  protected tableName = 'transactions';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();
      table.enum('txn_type', ['debit', 'credit']);
      table.enum('purpose', ['deposit', 'transfer', 'reversal', 'withdrawal']);
      table.decimal('amount', 20, 4).unsigned();
      table.integer('account_id').unsigned().references('accounts.id');
      table.uuid('reference');
      table.double('balance_before', 20, 4).unsigned();
      table.double('balance_after', 20, 4).unsigned();
      table.string('external_reference').nullable();
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
