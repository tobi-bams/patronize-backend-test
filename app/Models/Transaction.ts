import { DateTime } from 'luxon';
import Account from 'App/Models/Account';
import { BaseModel, column, BelongsTo, belongsTo } from '@ioc:Adonis/Lucid/Orm';

export default class Transaction extends BaseModel {
  @belongsTo(() => Account)
  public account: BelongsTo<typeof Account>;

  @column({ isPrimary: true })
  public id: number;

  @column()
  public txn_type: string;

  @column()
  public purpose: string;

  @column()
  public amount: number;

  @column()
  public account_id: number;

  @column()
  public reference: string;

  @column()
  public balance_before: number;

  @column()
  public balance_after: number;

  @column()
  public external_reference: string;

  @column()
  public third_party: string;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
