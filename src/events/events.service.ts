import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Event, EventStatus } from '../entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async getUpcomingEvents(): Promise<Event[]> {
    const now = new Date();
    return this.eventRepository.find({
      where: {
        event_date: MoreThanOrEqual(now),
        status: EventStatus.PUBLISHED,
      },
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

  async getMyEvents(sellerId: number): Promise<Event[]> {
    return this.eventRepository.find({
      where: { seller_id: sellerId },
      order: { created_at: 'DESC' },
    });
  }

  async create(dto: CreateEventDto, seller: User): Promise<Event> {
    const event = this.eventRepository.create({
      ...dto,
      seller_id: seller.id,
      status: EventStatus.PUBLISHED,
    });
    return this.eventRepository.save(event);
  }

  async update(id: number, dto: UpdateEventDto, sellerId: number): Promise<Event> {
    const event = await this.getEventById(id);

    if (event.seller_id !== sellerId) {
      throw new ForbiddenException('No tenés permisos para editar este evento');
    }

    Object.assign(event, dto);
    return this.eventRepository.save(event);
  }

  async remove(id: number, sellerId: number): Promise<void> {
    const event = await this.getEventById(id);

    if (event.seller_id !== sellerId) {
      throw new ForbiddenException('No tenés permisos para eliminar este evento');
    }

    event.status = EventStatus.CANCELLED;
    await this.eventRepository.save(event);
  }
}
