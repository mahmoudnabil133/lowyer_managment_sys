import { NestFactory } from '@nestjs/core';
import { AiServiceModule } from './ai_service.module';
import { RmqService } from '@app/rmq';

async function bootstrap() {
  const app = await NestFactory.create(AiServiceModule);
  const rmqService = app.get(RmqService);
  app.connectMicroservice(rmqService.getOptions('ai_queue'));
  await app.startAllMicroservices();
  await app.listen(process.env.AI_PORT ?? 3006);
  console.log(`AI service is running on port ${process.env.AI_PORT ?? 3006}`);
}
bootstrap();
