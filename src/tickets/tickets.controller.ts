import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('my-tickets/events')
  @UseGuards(JwtAuthGuard)
  async getMyPurchasedEvents(@CurrentUser() user: User) {
    return this.ticketsService.getMyPurchasedEvents(user.email);
  }

  @Get('my-tickets/event/:eventId')
  @UseGuards(JwtAuthGuard)
  async getMyTicketsForEvent(
    @CurrentUser() user: User,
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.ticketsService.getMyTicketsForEvent(user.email, eventId);
  }

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
