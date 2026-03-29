import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserType } from '../entities/user.entity';
import { CreateScannerInvitationDto } from './dto/create-scanner-invitation.dto';
import { AcceptScannerInvitationDto } from './dto/accept-scanner-invitation.dto';

@Controller('scanner')
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Get('invitations/validate')
  async validateInvitation(@Query('token') token: string) {
    return this.scannerService.validateInvitationToken(token);
  }

  @Post('invitations/accept')
  async acceptInvitation(@Body() dto: AcceptScannerInvitationDto) {
    return this.scannerService.acceptInvitation(dto.token, dto.name, dto.password);
  }

  @Post('scan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SCANNER)
  async scanTicket(
    @CurrentUser() user: User,
    @Body() body: { qrData: string; eventId: number },
  ) {
    return this.scannerService.scanTicket(body.qrData, user.id, body.eventId);
  }

  @Get('my-events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SCANNER)
  async getMyEvents(@CurrentUser() user: User) {
    return this.scannerService.getEventsForScanner(user.id);
  }

  @Get('event/:eventId/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SCANNER)
  async getEventStats(
    @CurrentUser() user: User,
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.scannerService.getEventStats(eventId, user.id);
  }

  @Post('invitations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async createInvitation(
    @CurrentUser() user: User,
    @Body() dto: CreateScannerInvitationDto,
  ) {
    return this.scannerService.inviteScanner(
      dto.eventId,
      dto.scannerEmail,
      user.id,
      user.type,
    );
  }

  @Post('invitations/:id/resend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async resendInvitation(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.scannerService.resendInvitation(id, user.id, user.type);
  }

  @Get('event/:eventId/invitations/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async getPendingInvitations(
    @CurrentUser() user: User,
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.scannerService.getPendingInvitations(
      eventId,
      user.id,
      user.type,
    );
  }

  @Delete('event/:eventId/scanner/:scannerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async removeScanner(
    @CurrentUser() user: User,
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('scannerId', ParseIntPipe) scannerId: number,
  ) {
    return this.scannerService.removeScanner(
      eventId,
      scannerId,
      user.id,
      user.type,
    );
  }

  @Get('event/:eventId/scanners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async getScannersByEvent(
    @CurrentUser() user: User,
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.scannerService.getScannersByEvent(
      eventId,
      user.id,
      user.type,
    );
  }
}
