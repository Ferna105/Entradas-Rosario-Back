import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { UsersService } from '../users/users.service';
import { TicketsService } from '../tickets/tickets.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Purchase } from '../entities/purchase.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { Event, EventStatus } from '../entities/event.entity';
import { NotificationType } from '../entities/notification.entity';

@Injectable()
export class PaymentsService {
  private platformClient: MercadoPagoConfig;
  private platformPayment: Payment;

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private ticketsService: TicketsService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    @InjectRepository(Purchase)
    private purchaseRepository: Repository<Purchase>,
    private dataSource: DataSource,
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
    ticketTypeId: number;
    buyerEmail: string;
    buyerName: string;
    quantity: number;
    showInAttendees?: boolean;
  }) {
    const baseUrlFront = this.configService.get<string>('BASE_URL_FRONT');
    const baseUrlBack = this.configService.get<string>('BASE_URL_BACK');

    if (!baseUrlFront || !baseUrlBack) {
      throw new BadRequestException(
        'BASE_URL_FRONT and BASE_URL_BACK must be defined',
      );
    }

    let savedPurchase!: Purchase;
    let event!: Event;
    let ticketTypeRow!: TicketType;

    await this.dataSource.transaction(async (manager) => {
      const ticketType = await manager
        .createQueryBuilder(TicketType, 'tt')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('tt.event', 'event')
        .where('tt.id = :tid', { tid: data.ticketTypeId })
        .andWhere('tt.event_id = :eid', { eid: data.eventId })
        .getOne();

      if (!ticketType) {
        throw new NotFoundException(
          'Tipo de entrada no encontrado para este evento',
        );
      }

      if (ticketType.event.status !== EventStatus.PUBLISHED) {
        throw new BadRequestException(
          'El evento no está disponible para la venta',
        );
      }

      const soldRaw = await manager
        .getRepository(Purchase)
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.quantity), 0)', 'sum')
        .where('p.ticket_type_id = :tid', { tid: data.ticketTypeId })
        .andWhere('p.payment_status = :status', { status: 'approved' })
        .getRawOne();
      const sold = Number(soldRaw?.sum ?? 0);

      if (sold + data.quantity > ticketType.capacity) {
        throw new BadRequestException(
          'No hay cupo suficiente para este tipo de entrada',
        );
      }

      const totalAmount =
        Math.round(Number(ticketType.price) * data.quantity * 100) / 100;

      const purchase = manager.getRepository(Purchase).create({
        event_id: ticketType.event_id,
        ticket_type_id: ticketType.id,
        buyer_name: data.buyerName,
        buyer_email: data.buyerEmail,
        quantity: data.quantity,
        total_amount: totalAmount,
        payment_status: 'pending',
        show_in_attendees:
          ticketType.event.show_attendees && data.showInAttendees === true,
      });
      savedPurchase = await manager.getRepository(Purchase).save(purchase);
      event = ticketType.event;
      ticketTypeRow = ticketType;
    });

    const totalAmount = Number(savedPurchase.total_amount);

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

    const itemTitle = `${event.name} — ${ticketTypeRow.name}`;

    const preferenceBody: Record<string, unknown> = {
      items: [
        {
          id: `${event.id}-${ticketTypeRow.id}`,
          title: itemTitle,
          unit_price: Number(ticketTypeRow.price),
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

    try {
      const response = await preference.create({
        body: preferenceBody as never,
      });

      savedPurchase.mp_preference_id = (response.id as string) || '';
      await this.purchaseRepository.save(savedPurchase);

      return {
        preferenceId: response.id,
        initPoint: response.init_point,
        purchaseId: savedPurchase.id,
      };
    } catch (err) {
      await this.purchaseRepository.delete(savedPurchase.id);
      throw err;
    }
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
        relations: ['event'],
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

      const previousStatus = purchase.payment_status;
      const newStatus =
        statusMap[payment.status || ''] || purchase.payment_status;

      purchase.payment_status = newStatus;
      purchase.mp_payment_id = payment.id?.toString() || '';

      await this.purchaseRepository.save(purchase);

      if (newStatus === 'approved' && previousStatus !== 'approved') {
        await this.generateTicketsAndNotify(purchase);
        await this.notifyPurchaseApproved(purchase);
      } else if (newStatus === 'rejected' && previousStatus !== 'rejected') {
        await this.notifyPurchaseRejected(purchase);
      }

      console.log(
        `Purchase ${purchaseId} actualizada: ${newStatus} (MP payment: ${payment.id})`,
      );
    } catch (error) {
      console.error('Error procesando webhook:', error);
    }
  }

  private async generateTicketsAndNotify(purchase: Purchase): Promise<void> {
    try {
      const fullPurchase = await this.purchaseRepository.findOne({
        where: { id: purchase.id },
        relations: ['event', 'ticketType'],
      });
      if (!fullPurchase?.event) {
        console.error(
          `Evento ${purchase.event_id} no encontrado para generar tickets`,
        );
        return;
      }

      const tickets =
        await this.ticketsService.generateTicketsForPurchase(fullPurchase);

      console.log(
        `${tickets.length} ticket(s) generados para purchase ${purchase.id}`,
      );

      await this.emailService.sendTicketEmail(
        fullPurchase.buyer_email,
        fullPurchase.buyer_name,
        fullPurchase.event,
        tickets,
        fullPurchase.ticketType?.name,
      );
    } catch (error) {
      console.error(
        `Error generando tickets/email para purchase ${purchase.id}:`,
        error,
      );
    }
  }

  async simulateApproved(purchaseId: number) {
    const purchase = await this.purchaseRepository.findOne({
      where: { id: purchaseId },
      relations: ['event', 'ticketType'],
    });
    if (!purchase) {
      throw new NotFoundException(`Compra ${purchaseId} no encontrada`);
    }

    purchase.payment_status = 'approved';
    await this.purchaseRepository.save(purchase);
    await this.generateTicketsAndNotify(purchase);
    await this.notifyPurchaseApproved(purchase);

    const updatedPurchase = await this.purchaseRepository.findOne({
      where: { id: purchaseId },
      relations: ['event', 'tickets', 'ticketType'],
    });

    return {
      message: `Pago simulado como aprobado, ${updatedPurchase?.tickets?.length || 0} ticket(s) generados`,
      purchase: updatedPurchase,
    };
  }

  private async notifyPurchaseApproved(purchase: Purchase): Promise<void> {
    try {
      const fullPurchase = await this.purchaseRepository.findOne({
        where: { id: purchase.id },
        relations: ['event'],
      });
      if (!fullPurchase?.event) return;

      const eventName = fullPurchase.event.name;
      const qty = fullPurchase.quantity;
      const total = Number(fullPurchase.total_amount) || 0;

      const buyer = fullPurchase.buyer_email
        ? await this.usersService.findByEmail(fullPurchase.buyer_email)
        : null;
      if (buyer) {
        await this.notificationsService.create({
          userId: buyer.id,
          type: NotificationType.PURCHASE_APPROVED,
          title: 'Tu compra fue confirmada',
          message: `${qty} ${qty === 1 ? 'entrada' : 'entradas'} para "${eventName}". Te enviamos los QR por email.`,
          data: {
            purchase_id: fullPurchase.id,
            event_id: fullPurchase.event_id,
            event_name: eventName,
            quantity: qty,
          },
        });
      }

      const sellerId = fullPurchase.event.seller_id;
      if (sellerId) {
        await this.notificationsService.create({
          userId: sellerId,
          type: NotificationType.NEW_SALE,
          title: 'Vendiste entradas',
          message: `${qty} ${qty === 1 ? 'entrada vendida' : 'entradas vendidas'} para "${eventName}" por $${total.toLocaleString('es-AR')}.`,
          data: {
            purchase_id: fullPurchase.id,
            event_id: fullPurchase.event_id,
            event_name: eventName,
            quantity: qty,
            total_amount: total,
          },
        });
      }
    } catch (error) {
      console.error(`Error notificando compra aprobada ${purchase.id}:`, error);
    }
  }

  private async notifyPurchaseRejected(purchase: Purchase): Promise<void> {
    try {
      const fullPurchase = await this.purchaseRepository.findOne({
        where: { id: purchase.id },
        relations: ['event'],
      });
      if (!fullPurchase?.event) return;
      if (!fullPurchase.buyer_email) return;

      const buyer = await this.usersService.findByEmail(
        fullPurchase.buyer_email,
      );
      if (!buyer) return;

      await this.notificationsService.create({
        userId: buyer.id,
        type: NotificationType.PURCHASE_REJECTED,
        title: 'Tu pago no se pudo procesar',
        message: `No pudimos confirmar tu compra de "${fullPurchase.event.name}". Intentá de nuevo o probá con otro medio de pago.`,
        data: {
          purchase_id: fullPurchase.id,
          event_id: fullPurchase.event_id,
          event_name: fullPurchase.event.name,
        },
      });
    } catch (error) {
      console.error(
        `Error notificando compra rechazada ${purchase.id}:`,
        error,
      );
    }
  }

  async getPurchaseById(id: number): Promise<Purchase> {
    const purchase = await this.purchaseRepository.findOne({
      where: { id },
      relations: ['event', 'tickets', 'ticketType'],
    });
    if (!purchase) {
      throw new NotFoundException(`Compra con ID ${id} no encontrada`);
    }
    return purchase;
  }
}
