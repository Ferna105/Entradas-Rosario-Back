import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { PreferenceRequest } from 'mercadopago/dist/clients/preference/commonTypes';

@Injectable()
export class PaymentsService {
  private client: MercadoPagoConfig;
  private preference: Preference;
  private payment: Payment;

  constructor(private configService: ConfigService) {
    const accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );

    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is not defined');
    }

    this.client = new MercadoPagoConfig({ accessToken });
    this.preference = new Preference(this.client);
    this.payment = new Payment(this.client);
  }

  async createPaymentPreference(data: {
    eventId: string;
    eventName: string;
    price: number;
    quantity: number;
  }) {
    try {
      const baseUrlFront = this.configService.get<string>('BASE_URL_FRONT');
      const baseUrlBack = this.configService.get<string>('BASE_URL_BACK');

      if (!baseUrlFront || !baseUrlBack) {
        throw new Error('BASE_URL_FRONT and BASE_URL_BACK must be defined');
      }

      const successUrl = `${baseUrlFront}/eventos/${data.eventId}/success`;
      const failureUrl = `${baseUrlFront}/eventos/${data.eventId}/failure`;
      const pendingUrl = `${baseUrlFront}/eventos/${data.eventId}/pending`;
      const webhookUrl = `${baseUrlBack}/api/payments/webhook`;

      const preference: PreferenceRequest = {
        items: [
          {
            id: data.eventId,
            title: data.eventName,
            unit_price: data.price,
            quantity: data.quantity,
            currency_id: 'ARS',
          },
        ],
        back_urls: {
          success: successUrl,
          failure: failureUrl,
          pending: pendingUrl,
        },
        notification_url: webhookUrl,
        auto_return: 'approved',
      };

      const response = await this.preference.create({
        body: preference,
      });

      return {
        preferenceId: response.id,
        initPoint: response.init_point,
      };
    } catch (error) {
      console.error('Error creating payment preference:', error);
      throw error;
    }
  }

  async handleWebhook(data: { type: string; data: { id: string } }) {
    try {
      if (data.type === 'payment') {
        const payment = await this.payment.get({ id: data.data.id });
        console.log('Payment status:', payment.status);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }
}
