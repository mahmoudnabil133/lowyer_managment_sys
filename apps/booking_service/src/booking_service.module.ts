import { Module } from '@nestjs/common';
import { BookingServiceController } from './booking_service.controller';
import { BookingServiceService } from './booking_service.service';
import { AppointmentController } from './appointment/appointment.controller';
import { AppointmentService } from './services/appointment.service';

@Module({
  imports: [],
  controllers: [BookingServiceController, AppointmentController],
  providers: [BookingServiceService, AppointmentService],
})
export class BookingServiceModule {}
