import { Module } from '@nestjs/common';
import { NotificationServiceController } from './notification_service.controller';
import { NotificationServiceService } from './notification_service.service';
import { RmqModule } from '@app/rmq';
import { MailerModule } from './nodemailer/nodemailer.module';

@Module({
  imports: [
    RmqModule.forRoot(),
    MailerModule,
  ],
  controllers: [NotificationServiceController],
  providers: [NotificationServiceService],
})
export class NotificationServiceModule {}
