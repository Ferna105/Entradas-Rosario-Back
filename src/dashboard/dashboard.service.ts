import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Event, EventStatus } from '../entities/event.entity';
import { Purchase } from '../entities/purchase.entity';

export interface DashboardStats {
  revenueThisMonth: number;
  ticketsSold: number;
  activeEvents: number;
  pendingPayout: number;
}

interface RawAmountRow {
  amount: string | null;
  fee: string | null;
}

function netFromRows(rows: RawAmountRow[]): number {
  return rows.reduce((sum, r) => {
    const gross = Number(r.amount ?? 0);
    const feePct = Number(r.fee ?? 0);
    return sum + gross * (1 - feePct / 100);
  }, 0);
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async getStats(sellerId: number): Promise<DashboardStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthRows = await this.purchaseRepository
      .createQueryBuilder('p')
      .innerJoin('p.event', 'e')
      .select('p.total_amount', 'amount')
      .addSelect('e.marketplace_fee_percent', 'fee')
      .where('e.seller_id = :sellerId', { sellerId })
      .andWhere('p.payment_status = :status', { status: 'approved' })
      .andWhere('p.created_at >= :since', { since: startOfMonth })
      .getRawMany<RawAmountRow>();

    const soldRow = await this.purchaseRepository
      .createQueryBuilder('p')
      .innerJoin('p.event', 'e')
      .select('COALESCE(SUM(p.quantity), 0)', 'sum')
      .where('e.seller_id = :sellerId', { sellerId })
      .andWhere('p.payment_status = :status', { status: 'approved' })
      .getRawOne<{ sum: string }>();

    const activeEvents = await this.eventRepository.count({
      where: {
        seller_id: sellerId,
        status: EventStatus.PUBLISHED,
        event_date: MoreThanOrEqual(now),
      },
    });

    const pendingRows = await this.purchaseRepository
      .createQueryBuilder('p')
      .innerJoin('p.event', 'e')
      .select('p.total_amount', 'amount')
      .addSelect('e.marketplace_fee_percent', 'fee')
      .where('e.seller_id = :sellerId', { sellerId })
      .andWhere('p.payment_status = :status', { status: 'approved' })
      .andWhere('e.event_date >= :now', { now })
      .getRawMany<RawAmountRow>();

    const round2 = (n: number) => Math.round(n * 100) / 100;

    return {
      revenueThisMonth: round2(netFromRows(monthRows)),
      ticketsSold: Number(soldRow?.sum ?? 0),
      activeEvents,
      pendingPayout: round2(netFromRows(pendingRows)),
    };
  }
}
