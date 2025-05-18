import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';

interface CreatePaymentPreferenceDto {
  eventId: number;
  buyerEmail: string;
  buyerName: string;
  quantity: number;
}

interface WebhookData {
  type: string;
  data: {
    id: string;
  };
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-preference')
  async createPaymentPreference(@Body() data: CreatePaymentPreferenceDto) {
    try {
      return await this.paymentsService.createPaymentPreference(data);
    } catch {
      throw new HttpException(
        'Error creating payment preference',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('webhook')
  async handleWebhook(@Body() data: WebhookData) {
    try {
      await this.paymentsService.handleWebhook(data);
      return { status: 'ok' };
    } catch {
      throw new HttpException(
        'Error processing webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
