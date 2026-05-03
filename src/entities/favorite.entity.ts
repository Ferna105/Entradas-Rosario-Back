import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Event } from './event.entity';

@Entity('favorites')
@Unique(['user_id', 'event_id'])
export class Favorite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  event_id: number;

  @ManyToOne(() => Event, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
