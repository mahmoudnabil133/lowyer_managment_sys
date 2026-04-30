import { Module } from '@nestjs/common';
import { BookingServiceController } from './booking_service.controller';
import { BookingServiceService } from './booking_service.service';

@Module({
  imports: [],
  controllers: [BookingServiceController],
  providers: [BookingServiceService],
})
export class BookingServiceModule {}
