import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../entities/event.entity';
import { Purchase } from '../entities/purchase.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Purchase])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
