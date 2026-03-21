import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Purchase } from './purchase.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  purchase_id: number;

  @ManyToOne(() => Purchase, (purchase) => purchase.tickets)
  @JoinColumn({ name: 'purchase_id' })
  purchase: Purchase;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
