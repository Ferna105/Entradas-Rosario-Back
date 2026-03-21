import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';

/** Orígenes permitidos: BASE_URL_FRONT puede ser varios separados por coma; sin barra final. */
function getAllowedCorsOrigins(): string[] {
  const raw = process.env.BASE_URL_FRONT || process.env.CORS_ORIGINS || '';
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const allowedOrigins = getAllowedCorsOrigins();

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.length === 0) {
        console.warn(
          'CORS: definí BASE_URL_FRONT (o varios separados por coma) con la URL exacta del front.',
        );
        callback(new Error('CORS no configurado'));
        return;
      }
      const normalized = origin.replace(/\/+$/, '');
      if (allowedOrigins.some((a) => a === normalized)) {
        callback(null, origin);
        return;
      }
      callback(new Error(`CORS: origen no permitido: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
