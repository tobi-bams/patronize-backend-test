import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Env from '@ioc:Adonis/Core/Env';
import User from 'App/Models/User';
import Database from '@ioc:Adonis/Lucid/Database';
import ExternalTransaction from 'App/Models/ExternalTransaction';
import Transaction from 'App/Models/Transaction';
import Account from 'App/Models/Account';
import Beneficiary from 'App/Models/Beneficiary';
import { schema, rules } from '@ioc:Adonis/Core/Validator';
const { v4 } = require('uuid');

const axios = require('axios');

export default class TransactionsController {
  public async chargeBank({ request, response }: HttpContextContract) {
    const chargeBankSchema = schema.create({
      email: schema.string({}, [rules.email()]),
      amount: schema.number(),
    });

    const payload = await request.validate({ schema: chargeBankSchema });
    const email = payload.email;
    const amount = Number(payload.amount);

    const paystackBody = {
      email: email,
      amount: amount * 100,
      bank: {
        account_number: '0000000000',
        code: '057',
      },
      birthday: '1995-12-23',
      otp: '123456',
    };

    // The line below serves for authentication, to know if the user exist in the system and to
    // know which user is performing the transaction.
    const user = await User.query().where('email', email).preload('account').first();
    if (!user) {
      response.status(401);
      return {
        status: false,
        message: 'Invalid Credentials',
      };
    }

    try {
      const charge = await axios.post('https://api.paystack.co/charge', paystackBody, {
        headers: {
          Authorization: `Bearer ${Env.get('PAYSTACK_SECRET')}`,
        },
      });

      const otpRequestBody = {
        otp: '123456',
        reference: charge.data.data.reference,
      };

      const submitOtp1 = await axios.post(
        'https://api.paystack.co/charge/submit_otp',
        otpRequestBody,
        {
          headers: {
            'Authorization': `Bearer ${Env.get('PAYSTACK_SECRET')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (submitOtp1.data.status) {
        const submitOtp2 = await axios.post(
          'https://api.paystack.co/charge/submit_otp',
          otpRequestBody,
          {
            headers: {
              'Authorization': `Bearer ${Env.get('PAYSTACK_SECRET')}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const external_transactions = new ExternalTransaction();

        external_transactions.fill({
          external_reference: submitOtp2.data.data.reference,
          account_id: user.account.id,
          amount: Number(submitOtp2.data.data.amount) / 100,
          status: 'pending',
          txn_type: 'Bank Funding',
          third_party: submitOtp2.data.data.authorization.bank,
        });

        await external_transactions.save();
        response.status(200);
        return {
          status: true,
          message: 'Account Funded Successfully',
        };
      }
    } catch (error) {
      console.log(error);
      response.status(500);
      return {
        status: false,
        message: 'Sorry an error occured please try again later',
      };
    }
  }

  public async chargeCard({ request, response }: HttpContextContract) {
    const chargeCardSchema = schema.create({
      email: schema.string({}, [rules.email()]),
      amount: schema.number(),
    });

    const payload = await request.validate({ schema: chargeCardSchema });
    const email = payload.email;
    const amount = Number(payload.amount);

    // The line below serves for authentication, to know if the user exist in the system and to
    // know which user is performing the transaction.
    const user = await User.query().where('email', email).preload('account').first();

    if (!user) {
      response.status(403);
      return {
        status: false,
        message: 'Invalid Credentials',
      };
    }

    const paystackRequestBody = {
      email: email,
      amount: amount * 100,
      card: {
        cvv: '408',
        number: '4084084084084081',
        expiry_month: '01',
        expiry_year: '99',
      },
    };

    try {
      const charge = await axios.post('https://api.paystack.co/charge', paystackRequestBody, {
        headers: {
          Authorization: `Bearer ${Env.get('PAYSTACK_SECRET')}`,
        },
      });

      if (charge.data.status) {
        const external_transactions = new ExternalTransaction();

        external_transactions.fill({
          external_reference: charge.data.data.reference,
          account_id: user.account.id,
          amount: Number(charge.data.data.amount) / 100,
          status: 'pending',
          txn_type: 'Card Funding',
          third_party: charge.data.data.authorization.bank,
        });

        await external_transactions.save();

        return {
          status: true,
          message: 'Account Funded Successfully',
        };
      }
    } catch (error) {
      console.log(error);
    }
  }

  public async createRecipient() {
    const recipientBody = {
      type: 'nuban',
      name: 'Zombie',
      description: 'Bamidele Oluwatobi',
      account_number: '0087241555',
      bank_code: '063',
      currency: 'NGN',
    };

    axios
      .post('https://api.paystack.co/transferrecipient', recipientBody, {
        headers: {
          'Authorization': `Bearer ${Env.get('PAYSTACK_SECRET')}`,
          'Content-Type': 'application/json',
        },
      })
      .then((res) => console.log(res))
      .catch((err) => console.log(err));
  }

  public async sendMoney({ request, response }: HttpContextContract) {
    const sendMoneySchema = schema.create({
      sender_email: schema.string({}, [rules.email()]),
      recipient_email: schema.string({}, [rules.email()]),
      amount: schema.number(),
    });

    const payload = await request.validate({ schema: sendMoneySchema });
    const senderEmail = payload.sender_email;
    const recipientEmail = payload.recipient_email;
    const amount = Number(payload.amount);

    if (senderEmail === recipientEmail) {
      response.status(403);
      return {
        status: false,
        message: "Sorry, you can't make transfer to yourself",
      };
    }

    // The line below serves for authentication, to know if the user exist in the system and to
    // know which user is performing the transaction.
    const sender = await User.query().where('email', senderEmail).first();

    if (!sender) {
      response.status(401);
      return {
        status: false,
        message: 'Invalid Credientials',
      };
    }

    const recipient = await User.query().where('email', recipientEmail).first();
    if (!recipient) {
      response.status(404);
      return {
        status: false,
        message: 'Recipient does not Exist on our platform, you can invite them to join',
      };
    }

    const senderAccount = await Account.query().where('user_id', sender.id).firstOrFail();
    const recipientAccount = await Account.query().where('user_id', recipient.id).firstOrFail();

    if (amount > Number(senderAccount.balance)) {
      response.status(403);
      return {
        status: false,
        message: 'Insufficient Balance',
      };
    }

    const trx = await Database.transaction();

    try {
      const senderTxn = new Transaction();
      senderTxn.fill({
        amount: amount,
        txn_type: 'debit',
        purpose: 'transfer',
        account_id: senderAccount.id,
        reference: v4(),
        balance_before: Number(senderAccount.balance),
        balance_after: Number(senderAccount.balance) - amount,
        third_party: recipient.name,
      });

      senderTxn.useTransaction(trx);
      await senderTxn.save();

      senderAccount.balance = Number(senderAccount.balance) - amount;
      senderAccount.useTransaction(trx);
      await senderAccount.save();

      const recipientTxn = new Transaction();
      recipientTxn.fill({
        amount: amount,
        txn_type: 'credit',
        purpose: 'transfer',
        account_id: recipientAccount.id,
        reference: v4(),
        balance_before: Number(recipientAccount.balance),
        balance_after: Number(recipientAccount.balance) + amount,
        third_party: sender.name,
      });

      recipientTxn.useTransaction(trx);
      await recipientTxn.save();

      recipientAccount.balance = Number(recipientAccount.balance) + amount;
      recipientAccount.useTransaction(trx);
      await recipientAccount.save();

      await trx.commit();
      response.status(200);
      return {
        status: true,
        message: 'Transfer Successful',
      };
    } catch (error) {
      await trx.rollback();
      console.log(error);
      response.status(500);
      return {
        status: false,
        message: 'Sorry an Error Occur Please try again later',
      };
    }
  }

  public async withdrawal({ response, request }: HttpContextContract) {
    const withdrawalSchema = schema.create({
      email: schema.string({}, [rules.email()]),
      amount: schema.number(),
      account_number: schema.string({}, [rules.maxLength(10), rules.minLength(10)]),
    });

    const payload = await request.validate({ schema: withdrawalSchema });
    const email = payload.email;
    const amount = Number(payload.amount);
    const account_number = payload.account_number;

    // The line below serves for authentication, to know if the user exist in the system and to
    // know which user is performing the transaction.
    const user = await User.query().where('email', email).first();

    if (!user) {
      response.status(401);
      return {
        status: false,
        message: 'Invalid Credentials',
      };
    }

    const beneficiary = await Beneficiary.query()
      .where('account_number', account_number)
      .where('user_id', user.id)
      .first();

    if (!beneficiary) {
      response.status(404);
      return {
        status: false,
        message: "You can only withdraw to a Bank Account you've added to the platform",
      };
    }

    const account = await Account.query().where('user_id', user.id).firstOrFail();
    if (amount > Number(account.balance)) {
      response.status(403);
      return {
        status: false,
        message: 'Insufficient Balance',
      };
    }

    const trx = await Database.transaction();
    const transferBody = {
      source: 'balance',
      amount: amount * 100,
      recipient: 'RCP_2y2y045018jozz8',
      reason: 'Withdraw from Patronize',
    };

    try {
      const currentBalance = Number(account.balance);

      const bankTransfer = await axios.post('https://api.paystack.co/transfer', transferBody, {
        headers: {
          'Authorization': `Bearer ${Env.get('PAYSTACK_SECRET')}`,
          'Content-Type': 'application/json',
        },
      });

      const external_txn = new ExternalTransaction();
      external_txn.fill({
        amount: amount,
        txn_type: 'Transfer',
        account_id: account.id,
        external_reference: bankTransfer.data.data.reference,
        third_party: user.name,
        status: 'pending',
      });

      external_txn.useTransaction(trx);
      await external_txn.save();

      const transaction = new Transaction();
      transaction.fill({
        amount: amount,
        txn_type: 'debit',
        purpose: 'widthdrawal',
        account_id: account.id,
        reference: v4(),
        balance_before: currentBalance,
        balance_after: currentBalance - amount,
        third_party: beneficiary.account_name,
        external_reference: bankTransfer.data.data.reference,
      });

      transaction.useTransaction(trx);
      await transaction.save();

      account.balance = currentBalance - amount;
      account.useTransaction(trx);
      await account.save();
      await trx.commit();

      response.status(200);
      return {
        status: true,
        message: 'Transaction Successful',
      };
    } catch (error) {
      await trx.rollback();
      console.log(error);
      response.status(500);
      return {
        status: false,
        message: 'Sorry an error occured, please try again later',
      };
    }
  }
}
