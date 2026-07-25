import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentServiceModule } from './document_service.module';
import { RmqService } from '@app/rmq';

async function bootstrap() {
  const app = await NestFactory.create(DocumentServiceModule);
  const rmqService = app.get(RmqService);
  app.connectMicroservice(rmqService.getOptions('document_queue'));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.startAllMicroservices();
  await app.listen(process.env.DOCUMENT_PORT ?? 3007);
  Logger.log(
    `Document service is running on port ${process.env.DOCUMENT_PORT ?? 3007}`,
  );
}
bootstrap();
