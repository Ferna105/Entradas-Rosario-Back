import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsModule } from './payments/payments.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MercadoPagoModule } from './mercadopago/mercadopago.module';
import { TicketsModule } from './tickets/tickets.module';
import { EmailModule } from './email/email.module';
import { ScannerModule } from './scanner/scanner.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', ''),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', ''),
        password: config.get<string>('DB_PASS', ''),
        database: config.get<string>('DB_NAME', ''),
        autoLoadEntities: true,
        synchronize: false,
        ssl: config.get<string>('DB_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
    AuthModule,
    UsersModule,
    MercadoPagoModule,
    PaymentsModule,
    EventsModule,
    TicketsModule,
    EmailModule,
    ScannerModule,
    ContactModule,
  ],
})
export class AppModule {}
