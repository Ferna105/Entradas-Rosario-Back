import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService, DashboardStats } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserType } from '../entities/user.entity';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SELLER, UserType.ADMIN)
  async getStats(@CurrentUser() user: User): Promise<DashboardStats> {
    return this.dashboardService.getStats(user.id);
  }
}
