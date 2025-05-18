import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { EventsService } from './events.service';
import { Event } from '../entities/event.entity';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('upcoming')
  async getUpcomingEvents(): Promise<Event[]> {
    return this.eventsService.getUpcomingEvents();
  }

  @Get(':id')
  async getEventById(@Param('id', ParseIntPipe) id: number): Promise<Event> {
    return this.eventsService.getEventById(id);
  }
}
