import { NestFactory } from '@nestjs/core';
import { BookingServiceModule } from './booking_service.module';

async function bootstrap() {
  const app = await NestFactory.create(BookingServiceModule);
  await app.listen(process.env.BOOKING_PORT ?? 3002);
}
bootstrap();
