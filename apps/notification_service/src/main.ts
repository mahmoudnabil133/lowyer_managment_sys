import { NestFactory } from '@nestjs/core';
import { NotificationServiceModule } from './notification_service.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
