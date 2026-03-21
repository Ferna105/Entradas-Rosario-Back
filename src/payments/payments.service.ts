import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { EventsService } from '../events/events.service';
import { UsersService } from '../users/users.service';
import { Purchase } from '../entities/purchase.entity';

@Injectable()
export class PaymentsService {
  private platformClient: MercadoPagoConfig;
  private platformPayment: Payment;

  constructor(
    private configService: ConfigService,
    private eventsService: EventsService,
    private usersService: UsersService,
    @InjectRepository(Purchase)
    private purchaseRepository: Repository<Purchase>,
  ) {
    const accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );

    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is not defined');
    }

    this.platformClient = new MercadoPagoConfig({ accessToken });
    this.platformPayment = new Payment(this.platformClient);
  }

  async createPaymentPreference(data: {
    eventId: number;
    buyerEmail: string;
    buyerName: string;
    quantity: number;
  }) {
    const baseUrlFront = this.configService.get<string>('BASE_URL_FRONT');
    const baseUrlBack = this.configService.get<string>('BASE_URL_BACK');

    if (!baseUrlFront || !baseUrlBack) {
      throw new BadRequestException(
        'BASE_URL_FRONT and BASE_URL_BACK must be defined',
      );
    }

    const event = await this.eventsService.getEventById(data.eventId);
    if (!event) {
      throw new NotFoundException(`Evento con ID ${data.eventId} no encontrado`);
    }

    const totalAmount = Number(event.price) * data.quantity;

    const purchase = this.purchaseRepository.create({
      event_id: event.id,
      buyer_name: data.buyerName,
      buyer_email: data.buyerEmail,
      quantity: data.quantity,
      total_amount: totalAmount,
      payment_status: 'pending',
    });
    const savedPurchase = await this.purchaseRepository.save(purchase);

    const externalReference = `purchase_${savedPurchase.id}`;

    const sellerAccessToken = await this.usersService.getMpAccessToken(
      event.seller_id,
    );

    let mpClient: MercadoPagoConfig;
    let marketplaceFee = 0;

    if (sellerAccessToken) {
      mpClient = new MercadoPagoConfig({ accessToken: sellerAccessToken });
      const feePercent = Number(event.marketplace_fee_percent) || 10;
      marketplaceFee = Math.round(totalAmount * (feePercent / 100) * 100) / 100;
    } else {
      mpClient = this.platformClient;
    }

    const preference = new Preference(mpClient);

    const successUrl = `${baseUrlFront}/compra/exito?purchase=${savedPurchase.id}`;
    const failureUrl = `${baseUrlFront}/compra/error?purchase=${savedPurchase.id}`;
    const pendingUrl = `${baseUrlFront}/compra/pendiente?purchase=${savedPurchase.id}`;
    const webhookUrl = `${baseUrlBack}/payments/webhook`;

    const preferenceBody: any = {
      items: [
        {
          id: event.id.toString(),
          title: event.name,
          unit_price: Number(event.price),
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
      external_reference: externalReference,
      payer: {
        name: data.buyerName,
        email: data.buyerEmail,
      },
    };

    if (sellerAccessToken && marketplaceFee > 0) {
      preferenceBody.marketplace_fee = marketplaceFee;
    }

    const response = await preference.create({ body: preferenceBody });

    savedPurchase.mp_preference_id = (response.id as string) || '';
    await this.purchaseRepository.save(savedPurchase);

    return {
      preferenceId: response.id,
      initPoint: response.init_point,
      purchaseId: savedPurchase.id,
    };
  }

  async handleWebhook(data: {
    type?: string;
    action?: string;
    data?: { id: string };
  }) {
    const paymentType = data.type || data.action;

    if (
      paymentType !== 'payment' &&
      paymentType !== 'payment.created' &&
      paymentType !== 'payment.updated'
    ) {
      return;
    }

    if (!data.data?.id) return;

    try {
      const payment = await this.platformPayment.get({ id: data.data.id });

      if (!payment.external_reference) return;

      const purchaseId = parseInt(
        payment.external_reference.replace('purchase_', ''),
        10,
      );
      if (isNaN(purchaseId)) return;

      const purchase = await this.purchaseRepository.findOne({
        where: { id: purchaseId },
      });
      if (!purchase) return;

      const statusMap: Record<string, string> = {
        approved: 'approved',
        pending: 'pending',
        authorized: 'pending',
        in_process: 'pending',
        in_mediation: 'pending',
        rejected: 'rejected',
        cancelled: 'rejected',
        refunded: 'refunded',
        charged_back: 'refunded',
      };

      const newStatus =
        statusMap[payment.status || ''] || purchase.payment_status;

      purchase.payment_status = newStatus;
      purchase.mp_payment_id = payment.id?.toString() || '';

      await this.purchaseRepository.save(purchase);

      console.log(
        `Purchase ${purchaseId} actualizada: ${newStatus} (MP payment: ${payment.id})`,
      );
    } catch (error) {
      console.error('Error procesando webhook:', error);
    }
  }

  async getPurchaseById(id: number): Promise<Purchase> {
    const purchase = await this.purchaseRepository.findOne({
      where: { id },
      relations: ['event'],
    });
    if (!purchase) {
      throw new NotFoundException(`Compra con ID ${id} no encontrada`);
    }
    return purchase;
  }
}
