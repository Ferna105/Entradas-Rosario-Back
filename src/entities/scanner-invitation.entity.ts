import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { User } from './user.entity';

export enum ScannerInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

@Entity('scanner_invitations')
export class ScannerInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  event_id: number;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 64 })
  token_hash: string;

  @Column({ type: 'varchar', length: 20, default: ScannerInvitationStatus.PENDING })
  status: ScannerInvitationStatus;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ type: 'int' })
  invited_by_user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invited_by_user_id' })
  invited_by: User;

  @Column({ type: 'timestamp', nullable: true })
  accepted_at: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
