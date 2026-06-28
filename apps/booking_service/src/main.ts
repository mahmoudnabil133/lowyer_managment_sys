import { NestFactory } from '@nestjs/core';
import { BookingServiceModule } from './booking_service.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(BookingServiceModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // remove extra properties
    // forbidNonWhitelisted: true, // throw error if extra properties are found
    transform: true // transform payloads to DTOs
  }));
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.BOOKING_PORT ?? 3002);
}
bootstrap();
