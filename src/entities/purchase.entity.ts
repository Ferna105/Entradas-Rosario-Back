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

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  event_id: number;

  @ManyToOne(() => Event, (event) => event.purchases)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ type: 'varchar', length: 100, nullable: true })
  buyer_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  buyer_email: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar', length: 10 })
  payment_status: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.purchase)
  tickets: Ticket[];
}
