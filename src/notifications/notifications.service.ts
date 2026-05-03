import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
} from '../entities/notification.entity';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export interface NotificationDto {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async create(input: {
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): Promise<Notification | null> {
    try {
      const entity = this.notificationRepository.create({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data ?? {},
      });
      return await this.notificationRepository.save(entity);
    } catch (error) {
      console.error('Error creando notificación:', error);
      return null;
    }
  }

  async list(userId: number, limit?: number): Promise<NotificationDto[]> {
    const take = Math.min(
      Math.max(1, Number(limit) || DEFAULT_LIMIT),
      MAX_LIMIT,
    );
    const rows = await this.notificationRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take,
    });
    return rows.map((n) => this.toDto(n));
  }

  async unreadCount(userId: number): Promise<number> {
    return this.notificationRepository.count({
      where: { user_id: userId, read_at: IsNull() },
    });
  }

  async markRead(userId: number, id: number): Promise<void> {
    await this.notificationRepository.update(
      { id, user_id: userId, read_at: IsNull() },
      { read_at: new Date() },
    );
  }

  async markAllRead(userId: number): Promise<{ updated: number }> {
    const result = await this.notificationRepository.update(
      { user_id: userId, read_at: IsNull() },
      { read_at: new Date() },
    );
    return { updated: result.affected ?? 0 };
  }

  private toDto(n: Notification): NotificationDto {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data || {},
      read_at: n.read_at ? n.read_at.toISOString() : null,
      created_at: n.created_at.toISOString(),
    };
  }
}
