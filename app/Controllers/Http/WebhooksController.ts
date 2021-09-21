import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Env from '@ioc:Adonis/Core/Env';
import ExternalTransaction from 'App/Models/ExternalTransaction';
import Transaction from 'App/Models/Transaction';
import Account from 'App/Models/Account';
import Database from '@ioc:Adonis/Lucid/Database';
const { v4 } = require('uuid');
const crypto = require('crypto');

export default class WebhooksController {
  public async webhookResponse({ response, request }: HttpContextContract) {
    const body = request.body();
    const header = request.header('x-paystack-signature');
    const paysatck_secret = Env.get('PAYSTACK_SECRET');

    let hash = crypto
      .createHmac('sha512', paysatck_secret)
      .update(JSON.stringify(body))
      .digest('hex');
    if (hash == header) {
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
            return;
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
            balance_after: Number(account.balance) + Number(data.amount) / 100,
          });

          transaction.useTransaction(trx);
          await transaction.save();

          account.balance = Number(account.balance) + Number(data.amount) / 100;
          account.useTransaction(trx);
          await account.save();

          await trx.commit();
          response.status(200);
        } catch (error) {
          await trx.rollback();
          console.log(error);
        }
      }

      if (event === 'transfer.success') {
        // I used a setTimeout below because the transfer transactions takes some seconds to commit and most times the
        // Paystack Webhook is already triggered before the transfer transaction commit, so the 6s delay helps solves that

        setTimeout(async () => {
          try {
            const external_transactions = await ExternalTransaction.findByOrFail(
              'external_reference',
              data.reference
            );

            if (external_transactions.status === 'success') {
              response.status(200);
              return;
            }
            external_transactions.status = data.status;

            external_transactions.useTransaction(trx);
            await external_transactions.save();
            await trx.commit();
          } catch (error) {
            await trx.rollback();
            console.log(error);
          }
        }, 500);
      }

      if (event === 'transfer.failed') {
        try {
          const external_transactions = await ExternalTransaction.findByOrFail(
            'external_refence',
            data.reference
          );

          if (external_transactions.status === 'failed') {
            response.status(200);
            return;
          }

          external_transactions.status = data.status;
          external_transactions.useTransaction(trx);
          await external_transactions.save();

          const account = await Account.findByOrFail('id', external_transactions.account_id);

          const transaction = new Transaction();
          transaction.fill({
            external_reference: data.reference,
            account_id: account.id,
            amount: Number(data.amount) / 100,
            txn_type: 'credit',
            purpose: 'reversal',
            third_party: 'Patronize',
            reference: v4(),
            balance_before: Number(account.balance),
            balance_after: Number(account.balance) + Number(data.amount) / 100,
          });
          transaction.useTransaction(trx);
          await transaction.save();

          account.balance = Number(account.balance) + Number(data.amount) / 100;
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
}
