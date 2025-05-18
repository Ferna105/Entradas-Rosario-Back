import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsModule } from './payments/payments.module';
import { User } from './entities/user.entity';
import { Event } from './entities/event.entity';
import { Purchase } from './entities/purchase.entity';
import { Ticket } from './entities/ticket.entity';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? '',
      port: parseInt(process.env.DB_PORT || '', 10),
      username: process.env.DB_USER || '',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || '',
      entities: [User, Event, Purchase, Ticket],
      synchronize: false,
      autoLoadEntities: true,
    }),
    PaymentsModule,
    EventsModule,
  ],
})
export class AppModule {}
