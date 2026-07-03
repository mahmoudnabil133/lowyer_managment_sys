import { NestFactory } from '@nestjs/core';
import { PaymentServiceModule } from './payment_service.module';
import { RmqService } from '@app/rmq';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(PaymentServiceModule, { rawBody: true });
  const rmqService = app.get(RmqService);
  app.connectMicroservice(rmqService.getOptions('payment_queue'));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.startAllMicroservices();
  await app.listen(process.env.PAYMENT_PORT ?? 3004);
}
bootstrap();
