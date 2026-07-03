import { Module } from '@nestjs/common';
import { PaymentServiceController } from './payment_service.controller';
import { PaymentServiceService } from './payment_service.service';
import { CatchExceptionsFilter } from '@app/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentEvent, PaymentEventSchema, PaymentSchema } from './payment.schema';
import { RmqModule } from '@app/rmq';
import Stripe from 'stripe';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    // JwtModule.register({
    //   global: true,
    // }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: function (config: ConfigService) {
        return {
          uri: config.get('Mongo_Uri'),
        };
      }
    }),
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: PaymentEvent.name, schema: PaymentEventSchema },
    ]),

    // RmqModule.register({ name: 'NOTIFICATION_SERVICE', queue: 'notification_queue' }),
    RmqModule.register({ name: 'BOOKING_SERVICE', queue: 'booking_queue' }),

  ],
  controllers: [PaymentServiceController],
  providers: [
    PaymentServiceService,
    {
      provide: Stripe,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new Stripe(configService.get<string>('STRIPE_SECRET_KEY'), {
          apiVersion: '2026-06-24.dahlia', // Use your targeted or latest stable Stripe API version
        });
      },
    },
    { provide: APP_FILTER, useClass: CatchExceptionsFilter }
  ],
})
export class PaymentServiceModule { }
