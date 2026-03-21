import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { Purchase } from '../entities/purchase.entity';

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

    return { valid: true, message: 'Entrada válida - Acceso permitido', ticket };
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
}
