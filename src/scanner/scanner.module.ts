import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScannerController } from './scanner.controller';
import { ScannerService } from './scanner.service';
import { EventScanner } from '../entities/event-scanner.entity';
import { ScannerInvitation } from '../entities/scanner-invitation.entity';
import { TicketsModule } from '../tickets/tickets.module';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventScanner, ScannerInvitation]),
    TicketsModule,
    UsersModule,
    EventsModule,
    EmailModule,
  ],
  controllers: [ScannerController],
  providers: [ScannerService],
  exports: [ScannerService],
})
export class ScannerModule {}
