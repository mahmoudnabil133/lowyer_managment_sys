import { NestFactory } from '@nestjs/core';
import { NotificationServiceModule } from './notification_service.module';
import { RmqService } from '@app/rmq';

async function bootstrap() {
  const app = await NestFactory.create(NotificationServiceModule);
  const rmqService = app.get(RmqService);
  app.connectMicroservice(rmqService.getOptions('notification_queue'));
  await app.startAllMicroservices();
  await app.listen(process.env.NOTIFICATION_PORT ?? 3003);
}
bootstrap();
