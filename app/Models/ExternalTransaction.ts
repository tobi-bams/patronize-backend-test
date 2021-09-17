import { DateTime } from 'luxon';
import Account from 'App/Models/Account';
import { BaseModel, column, BelongsTo, belongsTo } from '@ioc:Adonis/Lucid/Orm';

export default class ExternalTransaction extends BaseModel {
  @belongsTo(() => Account)
  public account: BelongsTo<typeof Account>;

  @column({ isPrimary: true })
  public id: number;

  @column()
  public external_reference: string;

  @column()
  public account_id: number;

  @column()
  public amount: number;

  @column()
  public status: string;

  @column()
  public txn_type: string;

  @column()
  public third_party: string;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
