import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { UsersModule } from '../users/users.module';
import { TicketsModule } from '../tickets/tickets.module';
import { EmailModule } from '../email/email.module';
import { Purchase } from '../entities/purchase.entity';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    TicketsModule,
    EmailModule,
    TypeOrmModule.forFeature([Purchase]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
