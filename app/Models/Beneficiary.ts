import { DateTime } from 'luxon';
import User from 'App/Models/User';
import { BaseModel, column, BelongsTo, belongsTo } from '@ioc:Adonis/Lucid/Orm';

export default class Beneficiary extends BaseModel {
  @belongsTo(() => User)
  public user: BelongsTo <typeof User>

  @column({ isPrimary: true })
  public id: number;

  @column()
  public account_number: number;

  @column()
  public bank_name: string;

  @column()
  public account_name: string;

  @column()
  public user_id: number;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
