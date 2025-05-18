import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  purchase_id: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
