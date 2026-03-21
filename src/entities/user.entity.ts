import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Event } from './event.entity';

export enum UserType {
  BUYER = 'buyer',
  SELLER = 'seller',
  ADMIN = 'admin',
  SCANNER = 'scanner',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'text' })
  password_hash: string;

  @Exclude()
  @Column({ type: 'text', nullable: true })
  mp_access_token: string;

  @Exclude()
  @Column({ type: 'text', nullable: true })
  mp_refresh_token: string;

  @Column({ type: 'text', nullable: true })
  mp_user_id: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'varchar', default: UserType.BUYER })
  type: UserType;

  @OneToMany(() => Event, (event) => event.seller)
  events: Event[];

  get isMpConnected(): boolean {
    return !!this.mp_access_token;
  }
}
