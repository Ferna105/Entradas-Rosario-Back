import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, MoreThanOrEqual } from 'typeorm';
import { Event, EventStatus } from '../entities/event.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { Purchase } from '../entities/purchase.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { User } from '../entities/user.entity';
import { TicketTypeItemDto } from './dto/ticket-type-item.dto';

export interface TicketTypePublic {
  id: number;
  event_id: number;
  name: string;
  price: number;
  capacity: number;
  sort_order: number;
  sold: number;
  remaining: number;
  isSoldOut: boolean;
}

export interface EventPublic {
  id: number;
  seller_id: number;
  name: string;
  description: string | null;
  location: string | null;
  event_date: Date;
  image: string | null;
  status: EventStatus;
  marketplace_fee_percent: number;
  created_at: Date;
  minPrice: number;
  ticketTypes: TicketTypePublic[];
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepository: Repository<TicketType>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    private readonly dataSource: DataSource,
  ) {}

  private assertUniqueTicketTypeNames(items: TicketTypeItemDto[]): void {
    const names = items.map((t) => t.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      throw new BadRequestException(
        'Los tipos de entrada no pueden repetir el mismo nombre',
      );
    }
  }

  private async getSoldQuantitiesByTicketTypeIds(
    ids: number[],
  ): Promise<Record<number, number>> {
    if (ids.length === 0) {
      return {};
    }
    const rows = await this.purchaseRepository
      .createQueryBuilder('p')
      .select('p.ticket_type_id', 'ticketTypeId')
      .addSelect('COALESCE(SUM(p.quantity), 0)', 'sold')
      .where('p.ticket_type_id IN (:...ids)', { ids })
      .andWhere('p.payment_status = :status', { status: 'approved' })
      .groupBy('p.ticket_type_id')
      .getRawMany();

    const map: Record<number, number> = {};
    for (const row of rows) {
      map[Number(row.ticketTypeId)] = Number(row.sold);
    }
    return map;
  }

  private async getSoldCount(
    manager: EntityManager,
    ticketTypeId: number,
  ): Promise<number> {
    const r = await manager
      .getRepository(Purchase)
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.quantity), 0)', 'sum')
      .where('p.ticket_type_id = :id', { id: ticketTypeId })
      .andWhere('p.payment_status = :status', { status: 'approved' })
      .getRawOne();
    return Number(r?.sum ?? 0);
  }

  async toPublicEvent(event: Event): Promise<EventPublic> {
    const types = [...(event.ticketTypes || [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const ids = types.map((t) => t.id);
    const soldMap = await this.getSoldQuantitiesByTicketTypeIds(ids);

    const ticketTypes: TicketTypePublic[] = types.map((tt) => {
      const sold = soldMap[tt.id] ?? 0;
      const remaining = tt.capacity - sold;
      return {
        id: tt.id,
        event_id: tt.event_id,
        name: tt.name,
        price: Number(tt.price),
        capacity: tt.capacity,
        sort_order: tt.sort_order,
        sold,
        remaining,
        isSoldOut: remaining <= 0,
      };
    });

    const prices = ticketTypes.map((t) => t.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    return {
      id: event.id,
      seller_id: event.seller_id,
      name: event.name,
      description: event.description,
      location: event.location,
      event_date: event.event_date,
      image: event.image,
      status: event.status,
      marketplace_fee_percent: Number(event.marketplace_fee_percent),
      created_at: event.created_at,
      minPrice,
      ticketTypes,
    };
  }

  private async findEventEntityWithTypes(id: number): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['ticketTypes'],
    });
    if (!event) {
      throw new NotFoundException(`Evento con ID ${id} no encontrado`);
    }
    return event;
  }

  async getUpcomingEvents(): Promise<EventPublic[]> {
    const now = new Date();
    const events = await this.eventRepository.find({
      where: {
        event_date: MoreThanOrEqual(now),
        status: EventStatus.PUBLISHED,
      },
      relations: ['ticketTypes'],
      order: { event_date: 'ASC' },
    });
    const out: EventPublic[] = [];
    for (const e of events) {
      out.push(await this.toPublicEvent(e));
    }
    return out;
  }

  async getEventById(id: number): Promise<EventPublic> {
    const event = await this.findEventEntityWithTypes(id);
    return this.toPublicEvent(event);
  }

  /** Uso interno: entidad con relaciones (p. ej. pagos). */
  async getEventEntityById(id: number): Promise<Event> {
    return this.findEventEntityWithTypes(id);
  }

  async getMyEvents(sellerId: number): Promise<EventPublic[]> {
    const events = await this.eventRepository.find({
      where: { seller_id: sellerId },
      relations: ['ticketTypes'],
      order: { created_at: 'DESC' },
    });
    const out: EventPublic[] = [];
    for (const e of events) {
      out.push(await this.toPublicEvent(e));
    }
    return out;
  }

  async create(dto: CreateEventDto, seller: User): Promise<EventPublic> {
    this.assertUniqueTicketTypeNames(dto.ticketTypes);

    const savedId = await this.dataSource.transaction(async (manager) => {
      const eventRepo = manager.getRepository(Event);
      const ttRepo = manager.getRepository(TicketType);

      const event = eventRepo.create({
        name: dto.name,
        description: dto.description,
        location: dto.location,
        event_date: new Date(dto.event_date),
        image: dto.image,
        seller_id: seller.id,
        status: EventStatus.PUBLISHED,
      });
      const saved = await eventRepo.save(event);

      for (let i = 0; i < dto.ticketTypes.length; i++) {
        const t = dto.ticketTypes[i];
        await ttRepo.save(
          ttRepo.create({
            event_id: saved.id,
            name: t.name.trim(),
            price: t.price,
            capacity: t.capacity,
            sort_order: t.sortOrder ?? i,
          }),
        );
      }

      return saved.id;
    });

    const event = await this.findEventEntityWithTypes(savedId);
    return this.toPublicEvent(event);
  }

  async update(
    id: number,
    dto: UpdateEventDto,
    sellerId: number,
  ): Promise<EventPublic> {
    const existingEvent = await this.findEventEntityWithTypes(id);

    if (existingEvent.seller_id !== sellerId) {
      throw new ForbiddenException('No tenés permisos para editar este evento');
    }

    await this.dataSource.transaction(async (manager) => {
      const eventRepo = manager.getRepository(Event);
      const ttRepo = manager.getRepository(TicketType);

      if (dto.name !== undefined) existingEvent.name = dto.name;
      if (dto.description !== undefined) existingEvent.description = dto.description;
      if (dto.location !== undefined) existingEvent.location = dto.location;
      if (dto.event_date !== undefined) {
        existingEvent.event_date = new Date(dto.event_date);
      }
      if (dto.image !== undefined) existingEvent.image = dto.image;
      if (dto.status !== undefined) existingEvent.status = dto.status;

      await eventRepo.save(existingEvent);

      if (dto.ticketTypes) {
        this.assertUniqueTicketTypeNames(dto.ticketTypes);

        const existingTypes = await ttRepo.find({
          where: { event_id: id },
        });
        const existingById = new Map(existingTypes.map((t) => [t.id, t]));
        const incomingWithId = new Set(
          dto.ticketTypes.filter((t) => t.id != null).map((t) => t.id as number),
        );

        for (let i = 0; i < dto.ticketTypes.length; i++) {
          const row = dto.ticketTypes[i];
          if (row.id != null) {
            const tt = existingById.get(row.id);
            if (!tt || tt.event_id !== id) {
              throw new BadRequestException('Tipo de entrada inválido');
            }
            const sold = await this.getSoldCount(manager, row.id);
            if (row.capacity < sold) {
              throw new BadRequestException(
                `La capacidad de "${tt.name}" no puede ser menor que las entradas ya vendidas (${sold})`,
              );
            }
            tt.name = row.name.trim();
            tt.price = row.price;
            tt.capacity = row.capacity;
            tt.sort_order = row.sortOrder ?? i;
            await ttRepo.save(tt);
          } else {
            await ttRepo.save(
              ttRepo.create({
                event_id: id,
                name: row.name.trim(),
                price: row.price,
                capacity: row.capacity,
                sort_order: row.sortOrder ?? i,
              }),
            );
          }
        }

        for (const tt of existingTypes) {
          if (!incomingWithId.has(tt.id)) {
            const sold = await this.getSoldCount(manager, tt.id);
            if (sold > 0) {
              throw new BadRequestException(
                `No se puede eliminar el tipo "${tt.name}" porque ya hay ventas`,
              );
            }
            await ttRepo.remove(tt);
          }
        }
      }
    });

    const event = await this.findEventEntityWithTypes(id);
    return this.toPublicEvent(event);
  }

  async remove(id: number, sellerId: number): Promise<void> {
    const event = await this.findEventEntityWithTypes(id);

    if (event.seller_id !== sellerId) {
      throw new ForbiddenException('No tenés permisos para eliminar este evento');
    }

    event.status = EventStatus.CANCELLED;
    await this.eventRepository.save(event);
  }
}
