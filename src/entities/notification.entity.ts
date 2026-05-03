import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  PURCHASE_APPROVED = 'purchase_approved',
  PURCHASE_REJECTED = 'purchase_rejected',
  NEW_SALE = 'new_sale',
  SCANNER_ACCEPTED = 'scanner_accepted',
  EVENT_PUBLISHED = 'event_published',
}

@Entity('notifications')
@Index('idx_notifications_user_id', ['user_id'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 40 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  data: Record<string, unknown>;

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
