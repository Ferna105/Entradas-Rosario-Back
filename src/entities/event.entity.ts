import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Purchase } from './purchase.entity';
import { TicketType } from './ticket-type.entity';

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  FINISHED = 'finished',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  seller_id: number;

  @ManyToOne(() => User, (user) => user.events)
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  @Column({ type: 'timestamp' })
  event_date: Date;

  @Column({ type: 'varchar', nullable: true })
  image: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: EventStatus.PUBLISHED,
  })
  status: EventStatus;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 10.0,
  })
  marketplace_fee_percent: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => Purchase, (purchase) => purchase.event)
  purchases: Purchase[];

  @OneToMany(() => TicketType, (tt) => tt.event)
  ticketTypes: TicketType[];
}
