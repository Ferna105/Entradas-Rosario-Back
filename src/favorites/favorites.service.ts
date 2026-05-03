import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../entities/favorite.entity';
import { EventsService, EventPublic } from '../events/events.service';
import { Event } from '../entities/event.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly eventsService: EventsService,
  ) {}

  async getFavorites(userId: number): Promise<EventPublic[]> {
    const favorites = await this.favoriteRepository.find({
      where: { user_id: userId },
      relations: ['event', 'event.ticketTypes'],
      order: { created_at: 'DESC' },
    });

    const out: EventPublic[] = [];
    for (const fav of favorites) {
      if (fav.event) {
        out.push(await this.eventsService.toPublicEvent(fav.event));
      }
    }
    return out;
  }

  async addFavorite(userId: number, eventId: number): Promise<void> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    const existing = await this.favoriteRepository.findOne({
      where: { user_id: userId, event_id: eventId },
    });
    if (!existing) {
      await this.favoriteRepository.save(
        this.favoriteRepository.create({ user_id: userId, event_id: eventId }),
      );
    }
  }

  async removeFavorite(userId: number, eventId: number): Promise<void> {
    await this.favoriteRepository.delete({
      user_id: userId,
      event_id: eventId,
    });
  }
}
