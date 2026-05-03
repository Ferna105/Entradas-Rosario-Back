import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { EventPublic } from '../events/events.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async getFavorites(@CurrentUser() user: User): Promise<EventPublic[]> {
    return this.favoritesService.getFavorites(user.id);
  }

  @Post(':eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async addFavorite(
    @CurrentUser() user: User,
    @Param('eventId', ParseIntPipe) eventId: number,
  ): Promise<void> {
    return this.favoritesService.addFavorite(user.id, eventId);
  }

  @Delete(':eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFavorite(
    @CurrentUser() user: User,
    @Param('eventId', ParseIntPipe) eventId: number,
  ): Promise<void> {
    return this.favoritesService.removeFavorite(user.id, eventId);
  }
}
