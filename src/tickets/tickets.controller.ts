import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('purchase/:purchaseId')
  @UseGuards(JwtAuthGuard)
  async getTicketsByPurchase(
    @Param('purchaseId', ParseIntPipe) purchaseId: number,
  ) {
    return this.ticketsService.getTicketsByPurchase(purchaseId);
  }

  @Get('event/:eventId')
  @UseGuards(JwtAuthGuard)
  async getTicketsByEvent(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.ticketsService.getTicketsByEvent(eventId);
  }
}
