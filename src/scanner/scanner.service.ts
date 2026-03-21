import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventScanner } from '../entities/event-scanner.entity';
import { TicketsService } from '../tickets/tickets.service';
import { UsersService } from '../users/users.service';
import { UserType } from '../entities/user.entity';

@Injectable()
export class ScannerService {
  constructor(
    @InjectRepository(EventScanner)
    private eventScannerRepository: Repository<EventScanner>,
    private ticketsService: TicketsService,
    private usersService: UsersService,
  ) {}

  async assignScanner(eventId: number, scannerEmail: string, assignerId: number) {
    const scanner = await this.usersService.findByEmail(scannerEmail);
    if (!scanner) {
      throw new NotFoundException(`Usuario con email ${scannerEmail} no encontrado`);
    }

    if (scanner.type !== UserType.SCANNER) {
      throw new BadRequestException(
        `El usuario ${scannerEmail} no tiene rol de escaneador`,
      );
    }

    const existing = await this.eventScannerRepository.findOne({
      where: { event_id: eventId, scanner_id: scanner.id },
    });
    if (existing) {
      throw new ConflictException('El escaneador ya está asignado a este evento');
    }

    const assignment = this.eventScannerRepository.create({
      event_id: eventId,
      scanner_id: scanner.id,
    });

    await this.eventScannerRepository.save(assignment);

    return {
      message: `Escaneador ${scanner.name} asignado al evento`,
      scanner: { id: scanner.id, name: scanner.name, email: scanner.email },
    };
  }

  async removeScanner(eventId: number, scannerId: number) {
    const assignment = await this.eventScannerRepository.findOne({
      where: { event_id: eventId, scanner_id: scannerId },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    await this.eventScannerRepository.remove(assignment);
    return { message: 'Escaneador removido del evento' };
  }

  async getScannersByEvent(eventId: number) {
    const assignments = await this.eventScannerRepository.find({
      where: { event_id: eventId },
      relations: ['scanner'],
    });

    return assignments.map((a) => ({
      id: a.scanner.id,
      name: a.scanner.name,
      email: a.scanner.email,
      assigned_at: a.assigned_at,
    }));
  }

  async getEventsForScanner(scannerId: number) {
    const assignments = await this.eventScannerRepository.find({
      where: { scanner_id: scannerId },
      relations: ['event'],
    });

    return assignments.map((a) => a.event);
  }

  async scanTicket(qrData: string, scannerId: number, eventId: number) {
    const isAssigned = await this.eventScannerRepository.findOne({
      where: { event_id: eventId, scanner_id: scannerId },
    });

    if (!isAssigned) {
      throw new ForbiddenException('No tenés permiso para escanear en este evento');
    }

    const ticket = await this.ticketsService.getTicketByQrData(qrData);

    if (!ticket) {
      return {
        valid: false,
        message: 'Entrada no encontrada - QR inválido',
      };
    }

    if (ticket.event_id !== eventId) {
      return {
        valid: false,
        message: 'Esta entrada no corresponde a este evento',
        ticket: {
          id: ticket.id,
          eventName: ticket.event?.name,
        },
      };
    }

    const result = await this.ticketsService.validateTicket(qrData, scannerId);

    if (result.valid && result.ticket) {
      return {
        valid: true,
        message: result.message,
        ticket: {
          id: result.ticket.id,
          buyerName: result.ticket.purchase?.buyer_name,
          buyerEmail: result.ticket.purchase?.buyer_email,
          eventName: result.ticket.event?.name,
        },
      };
    }

    return {
      valid: false,
      message: result.message,
      ticket: result.ticket
        ? {
            id: result.ticket.id,
            buyerName: result.ticket.purchase?.buyer_name,
            eventName: result.ticket.event?.name,
          }
        : undefined,
    };
  }

  async getEventStats(eventId: number, scannerId: number) {
    const isAssigned = await this.eventScannerRepository.findOne({
      where: { event_id: eventId, scanner_id: scannerId },
    });

    if (!isAssigned) {
      throw new ForbiddenException('No tenés permiso para ver este evento');
    }

    const tickets = await this.ticketsService.getTicketsByEvent(eventId);

    return {
      total: tickets.length,
      scanned: tickets.filter((t) => t.status === 'used').length,
      valid: tickets.filter((t) => t.status === 'valid').length,
      cancelled: tickets.filter((t) => t.status === 'cancelled').length,
    };
  }
}
