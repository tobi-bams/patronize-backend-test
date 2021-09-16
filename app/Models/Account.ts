import { DateTime } from 'luxon';
import User from 'App/Models/User';
import { BaseModel, column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm';

export default class Account extends BaseModel {
  @belongsTo(() => User)
  public user: BelongsTo<typeof User>;

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
