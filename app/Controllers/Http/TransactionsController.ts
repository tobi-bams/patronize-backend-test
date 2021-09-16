import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Env from '@ioc:Adonis/Core/Env';

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

  public async chargeCard(ctx: HttpContextContract) {
    const body = ctx.request.body();
    const response = ctx.response;

    const charge = await axios.post('https://api.paystack.co/charge', body, {
      headers: {
        Authorization: `Bearer ${Env.get('PAYSTACK_SECRET')}`,
      },
    });

    if (charge.data.status) {
      response.status(charge.status);
      return charge.data.data;
    } else {
      response.status(charge.status);
      return charge.data.data;
    }
  }

  public async createRecipient({ response }: HttpContextContract) {
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
    // console.log(createRecipient)
    // if(createRecipient.data.status){
    //   response.status(createRecipient.status);
    //   return createRecipient.data
    // }
    // if(!createRecipient.data.status){
    //   response.status(createRecipient.status)
    //   console.log(createRecipient.response)
    //   return createRecipient.response
    // }
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
}
