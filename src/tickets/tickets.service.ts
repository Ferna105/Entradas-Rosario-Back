import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { Purchase } from '../entities/purchase.entity';

export interface MyEventSummary {
  id: number;
  name: string;
  location: string | null;
  event_date: string;
  image: string | null;
  ticketCount: number;
}

export interface MyEventTickets {
  event: {
    id: number;
    name: string;
    description: string | null;
    location: string | null;
    event_date: string;
    image: string | null;
  };
  tickets: Array<{
    id: number;
    qr_code: string;
    qr_data: string;
    status: string;
    scanned_at: Date | null;
    ticket_type_name: string | null;
    purchase_id: number;
    buyer_name: string | null;
  }>;
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
  ) {}

  async generateTicketsForPurchase(purchase: Purchase): Promise<Ticket[]> {
    const tickets: Ticket[] = [];

    for (let i = 0; i < purchase.quantity; i++) {
      const qrData = `ticket_${uuidv4()}`;
      const qrCodeBase64 = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });

      const ticket = this.ticketRepository.create({
        purchase_id: purchase.id,
        event_id: purchase.event_id,
        ticket_type_id: purchase.ticket_type_id,
        qr_data: qrData,
        qr_code: qrCodeBase64,
        status: TicketStatus.VALID,
      });

      tickets.push(await this.ticketRepository.save(ticket));
    }

    return tickets;
  }

  async validateTicket(
    qrData: string,
    scannerId: number,
  ): Promise<{ valid: boolean; message: string; ticket?: Ticket }> {
    const ticket = await this.ticketRepository.findOne({
      where: { qr_data: qrData },
      relations: ['event', 'purchase'],
    });

    if (!ticket) {
      return { valid: false, message: 'Entrada no encontrada' };
    }

    if (ticket.status === TicketStatus.USED) {
      return {
        valid: false,
        message: `Entrada ya utilizada (escaneada el ${ticket.scanned_at?.toLocaleString('es-AR')})`,
        ticket,
      };
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      return { valid: false, message: 'Entrada cancelada', ticket };
    }

    ticket.status = TicketStatus.USED;
    ticket.scanned_at = new Date();
    ticket.scanned_by = scannerId;
    await this.ticketRepository.save(ticket);

    return {
      valid: true,
      message: 'Entrada válida - Acceso permitido',
      ticket,
    };
  }

  async getTicketsByPurchase(purchaseId: number): Promise<Ticket[]> {
    return this.ticketRepository.find({
      where: { purchase_id: purchaseId },
      relations: ['event'],
    });
  }

  async getTicketsByEvent(eventId: number): Promise<Ticket[]> {
    return this.ticketRepository.find({
      where: { event_id: eventId },
      relations: ['purchase'],
    });
  }

  async getTicketByQrData(qrData: string): Promise<Ticket | null> {
    return this.ticketRepository.findOne({
      where: { qr_data: qrData },
      relations: ['event', 'purchase'],
    });
  }

  async getMyPurchasedEvents(buyerEmail: string): Promise<MyEventSummary[]> {
    const rows = await this.ticketRepository
      .createQueryBuilder('t')
      .innerJoin('t.purchase', 'p')
      .innerJoin('t.event', 'e')
      .select('e.id', 'id')
      .addSelect('e.name', 'name')
      .addSelect('e.location', 'location')
      .addSelect('e.event_date', 'event_date')
      .addSelect('e.image', 'image')
      .addSelect('COUNT(t.id)::int', 'ticketCount')
      .where('LOWER(p.buyer_email) = LOWER(:email)', { email: buyerEmail })
      .andWhere('p.payment_status = :status', { status: 'approved' })
      .groupBy('e.id')
      .addGroupBy('e.name')
      .addGroupBy('e.location')
      .addGroupBy('e.event_date')
      .addGroupBy('e.image')
      .orderBy('e.event_date', 'ASC')
      .getRawMany<{
        id: number;
        name: string;
        location: string | null;
        event_date: Date;
        image: string | null;
        ticketCount: number;
      }>();

    return rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      location: r.location,
      event_date:
        r.event_date instanceof Date
          ? r.event_date.toISOString()
          : String(r.event_date),
      image: r.image,
      ticketCount: Number(r.ticketCount),
    }));
  }

  async getMyTicketsForEvent(
    buyerEmail: string,
    eventId: number,
  ): Promise<MyEventTickets> {
    const tickets = await this.ticketRepository
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.event', 'event')
      .innerJoinAndSelect('t.purchase', 'purchase')
      .leftJoinAndSelect('t.ticketType', 'ticketType')
      .where('t.event_id = :eventId', { eventId })
      .andWhere('LOWER(purchase.buyer_email) = LOWER(:email)', {
        email: buyerEmail,
      })
      .andWhere('purchase.payment_status = :status', { status: 'approved' })
      .orderBy('t.created_at', 'ASC')
      .getMany();

    if (tickets.length === 0) {
      throw new NotFoundException(
        'No se encontraron entradas para este evento',
      );
    }

    const event = tickets[0].event;

    return {
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        location: event.location,
        event_date:
          event.event_date instanceof Date
            ? event.event_date.toISOString()
            : String(event.event_date),
        image: event.image,
      },
      tickets: tickets.map((t) => ({
        id: t.id,
        qr_code: t.qr_code,
        qr_data: t.qr_data,
        status: t.status,
        scanned_at: t.scanned_at ?? null,
        ticket_type_name: t.ticketType?.name ?? null,
        purchase_id: t.purchase_id,
        buyer_name: t.purchase?.buyer_name ?? null,
      })),
    };
  }
}
