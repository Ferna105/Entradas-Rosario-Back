import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  event_id: number;

  @Column({ type: 'varchar' })
  buyer_name: string;

  @Column({ type: 'varchar' })
  buyer_email: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar' })
  payment_status: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
