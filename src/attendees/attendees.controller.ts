import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AttendeesService, AttendeesResponse } from './attendees.service';

@Controller('events')
export class AttendeesController {
  constructor(private readonly attendeesService: AttendeesService) {}

  @Get(':id/attendees')
  async getAttendees(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AttendeesResponse> {
    return this.attendeesService.getAttendeesForEvent(id);
  }
}
