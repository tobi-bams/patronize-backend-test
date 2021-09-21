import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { schema, rules } from '@ioc:Adonis/Core/Validator';

import User from 'App/Models/User';
import Database from '@ioc:Adonis/Lucid/Database';
import Account from 'App/Models/Account';
import Beneficiary from 'App/Models/Beneficiary';

export default class UsersController {
  public async createUser({ response, request }: HttpContextContract) {
    const newUserSchema = schema.create({
      email: schema.string({}, [rules.email()]),
      name: schema.string({ trim: true }),
      password: schema.string(),
    });

    const payload = await request.validate({ schema: newUserSchema });
    let email = payload.email;
    let name = payload.name;
    let password = payload.password;

    const trx = await Database.transaction();

    try {
      const existingUser = await User.query().where('email', email).first();

      if (existingUser) {
        response.status(403);
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

  public async createBeneficiary({ response, request }: HttpContextContract) {
    const bankDetailSchema = schema.create({
      bank_name: schema.string({ trim: true }),
      account_number: schema.string({}, [rules.maxLength(10), rules.minLength(10)]),
      account_name: schema.string({ trim: true }),
      email: schema.string({}, [rules.email()]),
    });

    const payload = await request.validate({schema: bankDetailSchema});
    const bank_name = payload.bank_name
    const account_number = payload.account_number;
    const account_name = payload.account_name;
    const email = payload.email;

    const user = await User.query().where('email', email).first();
    if (!user) {
      response.status(401);
      return {
        status: false,
        message: 'Invalid Credentials',
      };
    }

    const beneficiaryExist = await Beneficiary.query()
      .where('account_number', account_number)
      .first();

    if (beneficiaryExist) {
      response.status(403);
      return {
        status: false,
        message: 'Account already Exist',
      };
    }

    try {
      const beneficiary = new Beneficiary();
      beneficiary.fill({
        account_number: account_number,
        account_name: account_name,
        bank_name: bank_name,
        user_id: user.id,
      });

      await beneficiary.save();
      response.status(201);
      return {
        status: true,
        message: 'Bank Added Successfully',
      };
    } catch (error) {
      console.log(error);
      response.status(500);
      return {
        status: false,
        message: 'Sorry an error occured, please try again later',
      };
    }
  }
}
