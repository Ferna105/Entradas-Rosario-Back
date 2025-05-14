import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mercadopago from 'mercadopago';

interface MercadoPagoResponse<T> {
  body: T;
}

interface PreferenceResponse {
  id: string;
  init_point: string;
}

interface PaymentResponse {
  status: string;
}

@Injectable()
export class PaymentsService {
  constructor(private configService: ConfigService) {
    const accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is not defined');
    }
    mercadopago.configure({
      access_token: accessToken,
    });
  }

  async createPaymentPreference(data: {
    eventId: string;
    eventName: string;
    price: number;
    quantity: number;
  }) {
    try {
      const preference = {
        items: [
          {
            title: data.eventName,
            unit_price: data.price,
            quantity: data.quantity,
            currency_id: 'ARS',
          },
        ],
        back_urls: {
          success: `${this.configService.get('BASE_URL')}/eventos/${data.eventId}/success`,
          failure: `${this.configService.get('BASE_URL')}/eventos/${data.eventId}/failure`,
          pending: `${this.configService.get('BASE_URL')}/eventos/${data.eventId}/pending`,
        },
        notification_url: `${this.configService.get('BASE_URL')}/api/payments/webhook`,
        auto_return: 'approved',
      };

      const response = (await mercadopago.preferences.create(
        preference,
      )) as MercadoPagoResponse<PreferenceResponse>;
      return {
        preferenceId: response.body.id,
        initPoint: response.body.init_point,
      };
    } catch (error) {
      console.error('Error creating payment preference:', error);
      throw error;
    }
  }

  async handleWebhook(data: { type: string; data: { id: string } }) {
    try {
      if (data.type === 'payment') {
        const payment = (await mercadopago.payment.findById(
          data.data.id,
        )) as MercadoPagoResponse<PaymentResponse>;
        console.log('Payment status:', payment.body.status);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }
}
