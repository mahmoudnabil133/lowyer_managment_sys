import { Module } from '@nestjs/common';
import { RmqModule } from '@app/rmq';

@Module({
  imports: [
    RmqModule.register({ name: 'NOTIFICATION_SERVICE', queue: 'notification_queue' }),
  ],
  exports: [RmqModule],
})
export class SharedRmqModule {}