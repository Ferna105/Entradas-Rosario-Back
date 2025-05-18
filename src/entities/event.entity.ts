import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  seller_id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar' })
  location: string;

  @Column({ type: 'timestamp' })
  event_date: Date;

  @Column({ type: 'numeric' })
  price: number;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'varchar', nullable: true })
  image: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
