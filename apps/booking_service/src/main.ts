import { NestFactory } from '@nestjs/core';
import { BookingServiceModule } from './booking_service.module';
import { ValidationPipe } from '@nestjs/common';
import { RmqService } from '@app/rmq';

async function bootstrap() {
  const app = await NestFactory.create(BookingServiceModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true
  }));
  app.setGlobalPrefix('api/v1');
  const rmqService = app.get(RmqService);
  app.connectMicroservice(rmqService.getOptions('booking_queue'));
  await app.startAllMicroservices();

  await app.listen(process.env.BOOKING_PORT ?? 3002);
}
bootstrap();
