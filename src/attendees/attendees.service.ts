import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventStatus } from '../entities/event.entity';
import { Purchase } from '../entities/purchase.entity';

export interface PublicAttendee {
  name: string;
  initial: string;
}

export interface AttendeesResponse {
  total: number;
  attendees: PublicAttendee[];
}

@Injectable()
export class AttendeesService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
  ) {}

  private toPublic(buyerName: string | null): PublicAttendee | null {
    if (!buyerName) return null;
    const trimmed = buyerName.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(/\s+/);
    const first = parts[0];
    const initial = parts.length > 1 ? `${parts[1][0].toUpperCase()}.` : '';
    return { name: first, initial };
  }

  async getAttendeesForEvent(eventId: number): Promise<AttendeesResponse> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (
      !event ||
      event.status !== EventStatus.PUBLISHED ||
      !event.show_attendees
    ) {
      throw new NotFoundException('Lista de asistentes no disponible');
    }

    const rows = await this.purchaseRepository
      .createQueryBuilder('p')
      .select('p.buyer_name', 'buyer_name')
      .addSelect('COALESCE(SUM(p.quantity), 0)', 'sum')
      .where('p.event_id = :eventId', { eventId })
      .andWhere('p.payment_status = :status', { status: 'approved' })
      .andWhere('p.show_in_attendees = TRUE')
      .groupBy('p.buyer_name')
      .orderBy('MIN(p.created_at)', 'ASC')
      .getRawMany<{ buyer_name: string | null; sum: string }>();

    let total = 0;
    const attendees: PublicAttendee[] = [];
    for (const row of rows) {
      total += Number(row.sum);
      const pub = this.toPublic(row.buyer_name);
      if (pub) attendees.push(pub);
    }

    return { total, attendees };
  }
}
