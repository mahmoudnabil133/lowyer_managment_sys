import { Module } from '@nestjs/common';
import { AppointmentController, AvailabilityController, ScheduleController } from './booking_service.controller';
import { AppointmentService } from './services/appointment.service';
import { AvailabilityService } from './services/avaiilability.service';
import { SlotGeneratorService } from './services/slot-generator.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ProviderSchedule, providerScheduleSchema } from './models/provider-schedule.schema';
import { Appointment, AppointmentSchema } from './models/appointment.schema';
import { TimeSlot, TimeSlotSchema } from './models/slot.schema';
import { CatchExceptionsFilter, JwtStrategyService, RolesGuard } from '@app/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppointmentHistory, AppointmentHistorySchema } from './models/appointment-history.schema';
import { RmqModule } from '@app/rmq';
import { APP_FILTER } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    JwtModule.register({
      global: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: function (config: ConfigService) {
        return {
          uri: config.get('Mongo_Uri'),
        };
      }
    }),
    MongooseModule.forFeature([
      { name: ProviderSchedule.name, schema: providerScheduleSchema },
      { name: AppointmentHistory.name, schema: AppointmentHistorySchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: TimeSlot.name, schema: TimeSlotSchema }
    ]),

    RmqModule.register({ name: 'NOTIFICATION_SERVICE', queue: 'notification_queue' }),
  ],
  controllers: [AppointmentController, AvailabilityController, ScheduleController],
  providers: [
    AppointmentService,
    AvailabilityService,
    SlotGeneratorService,
    JwtStrategyService,
    RolesGuard,
    { provide: APP_FILTER, useClass: CatchExceptionsFilter }

  ],
  exports: [AppointmentService, AvailabilityService, SlotGeneratorService],
})
export class BookingServiceModule { }
