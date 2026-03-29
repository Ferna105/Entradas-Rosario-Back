import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';

interface CreatePaymentPreferenceDto {
  eventId: number;
  ticketTypeId: number;
  buyerEmail: string;
  buyerName: string;
  quantity: number;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-preference')
  async createPaymentPreference(@Body() data: CreatePaymentPreferenceDto) {
    try {
      return await this.paymentsService.createPaymentPreference(data);
    } catch (error) {
      console.error('Error en create-preference:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Error al crear la preferencia de pago',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('webhook')
  async handleWebhook(@Body() data: any) {
    await this.paymentsService.handleWebhook(data);
    return { status: 'ok' };
  }

  @Get('purchase/:id')
  async getPurchase(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.getPurchaseById(id);
  }

  @Post('simulate-approved/:id')
  async simulateApproved(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.simulateApproved(id);
  }
}
