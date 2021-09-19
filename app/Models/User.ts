import { DateTime } from 'luxon';
import Hash from '@ioc:Adonis/Core/Hash';
import Account from 'App/Models/Account';
import Beneficiary from 'App/Models/Beneficiary';
import {
  BaseModel,
  beforeSave,
  column,
  hasOne,
  HasOne,
  hasMany,
  HasMany,
} from '@ioc:Adonis/Lucid/Orm';

export default class User extends BaseModel {
  @hasOne(() => Account, {
    foreignKey: 'user_id',
  })
  public account: HasOne<typeof Account>;

  @hasMany(() => Beneficiary, {
    foreignKey: 'user_id',
  })
  public beneficiaries: HasMany<typeof Beneficiary>;

  @column({ isPrimary: true })
  public id: number;

  @column()
  public email: string;

  @column()
  public name: string;

  @column({ serializeAs: null })
  public password: string;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @beforeSave()
  public static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password);
    }
  }
}
