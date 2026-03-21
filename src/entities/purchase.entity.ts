import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { Ticket } from './ticket.entity';
import { User } from './user.entity';

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  event_id: number;

  @ManyToOne(() => Event, (event) => event.purchases)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ type: 'int', nullable: true })
  buyer_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  buyer_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  buyer_email: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  total_amount: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  payment_status: string;

  @Column({ type: 'text', nullable: true })
  mp_payment_id: string;

  @Column({ type: 'text', nullable: true })
  mp_preference_id: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.purchase)
  tickets: Ticket[];
}
