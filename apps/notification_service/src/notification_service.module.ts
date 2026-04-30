import { Module } from '@nestjs/common';
import { NotificationServiceController } from './notification_service.controller';
import { NotificationServiceService } from './notification_service.service';

@Module({
  imports: [],
  controllers: [NotificationServiceController],
  providers: [NotificationServiceService],
})
export class NotificationServiceModule {}
