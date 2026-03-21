import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Event } from '../entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserType } from '../entities/user.entity';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('upcoming')
  async getUpcomingEvents(): Promise<Event[]> {
    return this.eventsService.getUpcomingEvents();
  }

  @Get('my-events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async getMyEvents(@CurrentUser() user: User): Promise<Event[]> {
    return this.eventsService.getMyEvents(user.id);
  }

  @Get(':id')
  async getEventById(@Param('id', ParseIntPipe) id: number): Promise<Event> {
    return this.eventsService.getEventById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async create(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: User,
  ): Promise<Event> {
    return this.eventsService.create(dto, user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: User,
  ): Promise<Event> {
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
