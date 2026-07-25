import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ProviderServiceModule } from './provider_service.module';
import { RmqService } from '@app/rmq';

async function bootstrap() {
  const app = await NestFactory.create(ProviderServiceModule);
  const rmqService = app.get(RmqService);
  app.connectMicroservice(rmqService.getOptions('provider_queue'));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.startAllMicroservices();
  await app.listen(process.env.PROVIDER_PORT ?? 3005);
  Logger.log(`Provider service on port ${process.env.PROVIDER_PORT ?? 3005}`);
}
bootstrap();
