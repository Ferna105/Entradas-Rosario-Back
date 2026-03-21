import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Purchase } from './purchase.entity';
import { Event } from './event.entity';
import { User } from './user.entity';

export enum TicketStatus {
  VALID = 'valid',
  USED = 'used',
  CANCELLED = 'cancelled',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  purchase_id: number;

  @ManyToOne(() => Purchase, (purchase) => purchase.tickets)
  @JoinColumn({ name: 'purchase_id' })
  purchase: Purchase;

  @Column({ type: 'int', nullable: true })
  event_id: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ type: 'text' })
  qr_data: string;

  @Column({ type: 'text', nullable: true })
  qr_code: string;

  @Column({ type: 'varchar', length: 20, default: TicketStatus.VALID })
  status: TicketStatus;

  @Column({ type: 'timestamp', nullable: true })
  scanned_at: Date;

  @Column({ type: 'int', nullable: true })
  scanned_by: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'scanned_by' })
  scanner: User;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
