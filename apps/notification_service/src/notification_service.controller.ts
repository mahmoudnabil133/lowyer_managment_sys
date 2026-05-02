import { Controller, Get } from '@nestjs/common';
import { NotificationServiceService } from './notification_service.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { RmqService } from '@app/rmq';

@Controller()
export class NotificationServiceController {
  constructor(private readonly notificationServiceService: NotificationServiceService, private readonly rmqService: RmqService) {}

  @Get()
  getHello(): string {
    return this.notificationServiceService.getHello();
  }
  @EventPattern('user_created')
  async handleUserCreated
  (
    @Payload() data: { userId: string, email: string },
    @Ctx() context:RmqContext,
  ) {
    console.log('Received user_created event with data:', data);
    this.rmqService.ack(context);
  }

}
