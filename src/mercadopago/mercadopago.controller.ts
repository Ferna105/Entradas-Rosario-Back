import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoService } from './mercadopago.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserType } from '../entities/user.entity';

@Controller('mp')
export class MercadoPagoController {
  constructor(
    private readonly mpService: MercadoPagoService,
    private readonly configService: ConfigService,
  ) {}

  @Get('auth-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  getAuthUrl(@CurrentUser() user: User) {
    const url = this.mpService.getAuthUrl(user.id);
    return { url };
  }

  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontUrl = this.configService.get<string>('BASE_URL_FRONT');

    try {
      await this.mpService.handleOAuthCallback(code, state);
      res.redirect(`${frontUrl}/dashboard?mp=connected`);
    } catch (error) {
      console.error('Error en callback de MercadoPago:', error);
      res.redirect(`${frontUrl}/dashboard?mp=error`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async disconnect(@CurrentUser() user: User) {
    await this.mpService.disconnect(user.id);
    return { message: 'Cuenta de MercadoPago desvinculada' };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async getStatus(@CurrentUser() user: User) {
    return {
      connected: !!user.mp_access_token,
      mpUserId: user.mp_user_id || null,
    };
  }
}
