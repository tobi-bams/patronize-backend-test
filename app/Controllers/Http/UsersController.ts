import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';

import User from 'App/Models/User';
import Database from '@ioc:Adonis/Lucid/Database';
import Account from 'App/Models/Account';

export default class UsersController {
  public async createUser({ response, request }: HttpContextContract) {
    let email = request.input('email');
    let name = request.input('name');
    let password = request.input('password');

    const trx = await Database.transaction();

    try {
      const existingUser = await User.query().where('email', email).first();

      if (existingUser) {
        response.status(400);
        return {
          status: false,
          message: 'User Already Exist',
        };
      }

      const user = new User();
      user.name = name;
      user.email = email;
      user.password = password;

      user.useTransaction(trx);

      await user.save();

      const account = new Account();
      account.balance = 0;
      account.user_id = user.id;
      account.useTransaction(trx);

      await account.save();

      await trx.commit();
      response.status(201);
      return {
        status: true,
        message: 'Account Created Successfully',
      };
    } catch (error) {
      response.status(500);
      await trx.rollback();
      return error;
    }
  }
}
