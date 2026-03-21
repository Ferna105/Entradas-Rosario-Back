import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserType } from '../entities/user.entity';

@Controller('scanner')
@UseGuards(JwtAuthGuard)
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('scan')
  @UseGuards(RolesGuard)
  @Roles(UserType.SCANNER)
  async scanTicket(
    @CurrentUser() user: User,
    @Body() body: { qrData: string; eventId: number },
  ) {
    return this.scannerService.scanTicket(body.qrData, user.id, body.eventId);
  }

  @Get('my-events')
  @UseGuards(RolesGuard)
  @Roles(UserType.SCANNER)
  async getMyEvents(@CurrentUser() user: User) {
    return this.scannerService.getEventsForScanner(user.id);
  }

  @Get('event/:eventId/stats')
  @UseGuards(RolesGuard)
  @Roles(UserType.SCANNER)
  async getEventStats(
    @CurrentUser() user: User,
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.scannerService.getEventStats(eventId, user.id);
  }

  @Post('assign')
  @UseGuards(RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async assignScanner(
    @CurrentUser() user: User,
    @Body() body: { eventId: number; scannerEmail: string },
  ) {
    return this.scannerService.assignScanner(
      body.eventId,
      body.scannerEmail,
      user.id,
    );
  }

  @Delete('event/:eventId/scanner/:scannerId')
  @UseGuards(RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async removeScanner(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('scannerId', ParseIntPipe) scannerId: number,
  ) {
    return this.scannerService.removeScanner(eventId, scannerId);
  }

  @Get('event/:eventId/scanners')
  @UseGuards(RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async getScannersByEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.scannerService.getScannersByEvent(eventId);
  }
}
