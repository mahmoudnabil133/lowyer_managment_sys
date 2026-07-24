import {
  CatchExceptionsFilter,
  CatchGatewayExceptionsFilter,
  JwtStrategyService,
  RolesGuard,
} from '@app/common';
import { RmqModule } from '@app/rmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BookingController } from './booking/booking.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { BookingService } from './booking/booking.service';
import { ProviderController } from './provider/provider.controller';
import { AdminProviderController } from './provider/admin-provider.controller';
import { ProviderService } from './provider/provider.service';
import { DocumentController } from './document/documrnt.controller';
import { DocumentService } from './document/document.service';
import { AiController } from './ai/ai.controller';
import { AiService } from './ai/ai.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JwtModule.register({
      global: true,
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // النطاق الزمني: دقيقة واحدة (60000 ملي ثانية)
          limit: 4, // الحد الأقصى: 10 طلبات فقط خلال هذا النطاق
        },
      ],
    }),

    RmqModule.register({
      name: 'NOTIFICATION_SERVICE',
      queue: 'notification_queue',
    }),
    RmqModule.register({ name: 'PAYMENT_SERVICE', queue: 'payment_queue' }),
    RmqModule.register({ name: 'AUTH_SERVICE', queue: 'auth_queue' }),
    RmqModule.register({ name: 'BOOKING_SERVICE', queue: 'booking_queue' }),
    RmqModule.register({ name: 'PROVIDER_SERVICE', queue: 'provider_queue' }),
    RmqModule.register({ name: 'DOCUMENT_SERVICE', queue: 'document_queue' }),
    RmqModule.register({ name: 'AI_SERVICE', queue: 'ai_queue' }),
  ],
  controllers: [
    BookingController,
    AuthController,
    ProviderController,
    AdminProviderController,
    DocumentController,
    AiController,
  ],
  providers: [
    JwtStrategyService,
    ProviderService,
    AuthService,
    BookingService,
    DocumentService,
    AiService,
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // تفعيل الحارس (Guard) عالمياً على مستوى التطبيق بالكامل
    RolesGuard,
    { provide: APP_FILTER, useClass: CatchGatewayExceptionsFilter },
  ],
})
export class ApiGatewayModule {}
