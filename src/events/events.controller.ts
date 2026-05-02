import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { EventsService, EventPublic } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserType } from '../entities/user.entity';
import { EventCategory } from '../entities/event.entity';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('upcoming')
  async getUpcomingEvents(
    @Query('category') category?: string,
    @Query('q') q?: string,
    @Query('location') location?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<EventPublic[]> {
    let parsedCategory: EventCategory | undefined;
    if (category) {
      const valid = Object.values(EventCategory) as string[];
      if (!valid.includes(category)) {
        throw new BadRequestException('Categoría inválida');
      }
      parsedCategory = category as EventCategory;
    }

    const parseDate = (
      value: string | undefined,
      label: string,
    ): Date | undefined => {
      if (!value) return undefined;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException(`Fecha inválida en "${label}"`);
      }
      return d;
    };

    return this.eventsService.getUpcomingEvents({
      category: parsedCategory,
      q: q?.trim() || undefined,
      location: location?.trim() || undefined,
      from: parseDate(from, 'from'),
      to: parseDate(to, 'to'),
    });
  }

  @Get('my-events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async getMyEvents(@CurrentUser() user: User): Promise<EventPublic[]> {
    return this.eventsService.getMyEvents(user.id);
  }

  @Get(':id')
  async getEventById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<EventPublic> {
    return this.eventsService.getEventById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async create(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: User,
  ): Promise<EventPublic> {
    return this.eventsService.create(dto, user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: User,
  ): Promise<EventPublic> {
    return this.eventsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    await this.eventsService.remove(id, user.id);
    return { message: 'Evento cancelado exitosamente' };
  }
}
