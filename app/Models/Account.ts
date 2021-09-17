import { DateTime } from 'luxon';
import User from 'App/Models/User';
import Transaction from 'App/Models/Transaction';
import { BaseModel, column, belongsTo, BelongsTo, HasMany, hasMany } from '@ioc:Adonis/Lucid/Orm';
import ExternalTransaction from './ExternalTransaction';

export default class Account extends BaseModel {
  @belongsTo(() => User)
  public user: BelongsTo<typeof User>;

  @hasMany(() => Transaction, {
    foreignKey: 'account_id',
  })
  public transactions: HasMany<typeof Transaction>;

  @hasMany(() => ExternalTransaction, {
    foreignKey: 'account_id',
  })
  public external_transactions: HasMany<typeof ExternalTransaction>;

  @column({ isPrimary: true })
  public id: number;

  @column()
  public user_id: number;

  @column()
  public balance: number;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
