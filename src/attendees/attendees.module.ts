import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../entities/event.entity';
import { Purchase } from '../entities/purchase.entity';
import { AttendeesController } from './attendees.controller';
import { AttendeesService } from './attendees.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Purchase])],
  controllers: [AttendeesController],
  providers: [AttendeesService],
})
export class AttendeesModule {}
