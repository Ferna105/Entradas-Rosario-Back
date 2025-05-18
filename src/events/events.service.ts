import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Event } from '../entities/event.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async getUpcomingEvents(): Promise<Event[]> {
    const now = new Date();
    return this.eventRepository.find({
      where: { event_date: MoreThanOrEqual(now) },
      order: { event_date: 'ASC' },
    });
  }

  async getEventById(id: number): Promise<Event> {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Evento con ID ${id} no encontrado`);
    }
    return event;
  }
}
