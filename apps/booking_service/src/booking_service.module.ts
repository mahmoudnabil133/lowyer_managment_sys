import { Module } from '@nestjs/common';
import { BookingServiceController } from './booking_service.controller';
import { BookingServiceService } from './booking_service.service';
import { AppointmentController } from './appointment/appointment.controller';

@Module({
  imports: [],
  controllers: [BookingServiceController, AppointmentController],
  providers: [BookingServiceService],
})
export class BookingServiceModule {}
