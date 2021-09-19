import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Env from '@ioc:Adonis/Core/Env';
import User from 'App/Models/User';
// import Account from 'App/Models/Account';
import Database from '@ioc:Adonis/Lucid/Database';
import ExternalTransaction from 'App/Models/ExternalTransaction';
import Transaction from 'App/Models/Transaction';
import Account from 'App/Models/Account';
const { v4 } = require('uuid');

const axios = require('axios');

export default class TransactionsController {
  public async chargeBank(ctx: HttpContextContract) {
    const body = ctx.request.body();
    const response = ctx.response;

    try {
      const charge = await axios.post('https://api.paystack.co/charge', body, {
        headers: {
          Authorization: `Bearer ${Env.get('PAYSTACK_SECRET')}`,
        },
      });
      if (charge.data.status) {
        response.status(charge.status);
        return charge.data.data;
      }
    } catch (error) {
      console.log(error);
    }
  }

  public async submitOtp({ request, response }: HttpContextContract) {
    const otp = '123456';
    const reference = request.input('reference');
    const otpRequestBody = {
      otp,
      reference,
    };
    const submitOtp = await axios.post(
      'https://api.paystack.co/charge/submit_otp',
      otpRequestBody,
      {
        headers: {
          'Authorization': `Bearer ${Env.get('PAYSTACK_SECRET')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (submitOtp.data.status) {
      response.status(submitOtp.status);
      return submitOtp.data.data;
    } else {
      response.status(submitOtp.status);
      return submitOtp.data.data;
    }
  }

  public async chargeCard({ request, response }: HttpContextContract) {
    const email = request.input('email');
    const amount = request.input('amount');

    const user = await User.query().where('email', email).first();

    if (!user) {
      response.status(403);
      return {
        status: false,
        message: 'Invalid Credentials',
      };
    }

    const paystackRequestBody = {
      email: email,
      amount: parseInt(amount) * 100,
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
          account_id: user.id,
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

  public async bankTransfer({ response }: HttpContextContract) {
    const transferBody = {
      source: 'balance',
      amount: '5000000',
      recipient: 'RCP_2y2y045018jozz8',
      reason: 'Withdraw from Patronize',
    };

    // const transferBody = {
    //   transfer_code: "TRF_mrmm7bdm5liinig",
    //   otp: "136109"
    // }

    try {
      const bankTransfer = await axios.post('https://api.paystack.co/transfer', transferBody, {
        headers: {
          'Authorization': `Bearer ${Env.get('PAYSTACK_SECRET')}`,
          'Content-Type': 'application/json',
        },
      });

      if (bankTransfer.data.status) {
        response.status(bankTransfer.status);
        return bankTransfer.data;
      }
    } catch (error) {
      console.log(error);
    }
  }

  public async sendMoney({ request, response }: HttpContextContract) {
    const senderEmail = request.input('sender_email');
    const recipientEmail = request.input('recipient_email');
    const amount = Number(request.input('amount'));

    if (senderEmail === recipientEmail) {
      response.status(403);
      return {
        status: false,
        message: "Sorry, you can't make transfer to yourself",
      };
    }

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

  public async webhookResponse({ request, response }: HttpContextContract) {
    const event = request.input('event');
    const data = request.input('data');

    const trx = await Database.transaction();

    if (event === 'charge.success') {
      try {
        const external_transactions = await ExternalTransaction.findByOrFail(
          'external_reference',
          data.reference
        );

        if (external_transactions.status === 'success') {
          response.status(200);
        }
        external_transactions.status = data.status;

        external_transactions.useTransaction(trx);
        await external_transactions.save();

        const account = await Account.findByOrFail('id', external_transactions.account_id);

        const transaction = new Transaction();
        transaction.fill({
          external_reference: data.reference,
          account_id: external_transactions.account_id,
          amount: Number(data.amount) / 100,
          txn_type: 'credit',
          third_party: data.authorization.bank,
          purpose: 'deposit',
          reference: v4(),
          balance_before: account.balance,
          balance_after: Number(account.balance) + (Number(data.amount) / 100),
        });

        transaction.useTransaction(trx);
        await transaction.save();

        account.balance = Number(account.balance) + (Number(data.amount) / 100);
        account.useTransaction(trx);
        await account.save();

        await trx.commit();
        response.status(200);
      } catch (error) {
        await trx.rollback();
        console.log(error);
      }
    }
  }
}
