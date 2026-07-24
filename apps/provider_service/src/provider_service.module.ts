import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_FILTER } from '@nestjs/core';
import {
  CatchExceptionsFilter,
  JwtStrategyService,
  RolesGuard,
} from '@app/common';
import { RmqModule } from '@app/rmq';

import {
  ProviderProfile,
  ProviderProfileSchema,
} from './models/provider-profile.schema';
import {
  ProviderReview,
  ProviderReviewSchema,
} from './models/provider-review.schema';

import { ProfileController } from './controllers/profile.controller';
import { ReviewController } from './controllers/review.controller';
import { ProviderRpcController } from './rpc/provider.rpc.controller';

import { ProfileService } from './services/profile.service';
import { ReviewService } from './services/review.service';
import { SearchService } from './services/search.service';
import { AdminController } from './controllers/admin.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    JwtModule.register({ global: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.get('Mongo_Uri') }),
    }),
    MongooseModule.forFeature([
      { name: ProviderProfile.name, schema: ProviderProfileSchema },
      { name: ProviderReview.name, schema: ProviderReviewSchema },
    ]),
    RmqModule.register({
      name: 'NOTIFICATION_SERVICE',
      queue: 'notification_queue',
    }),
    RmqModule.register({ name: 'BOOKING_SERVICE', queue: 'booking_queue' }),
    RmqModule.register({ name: 'AUTH_SERVICE', queue: 'auth_queue' }),
  ],
  controllers: [
    ProfileController,
    ReviewController,
    AdminController,
    ProviderRpcController,
  ],
  providers: [
    ProfileService,
    ReviewService,
    SearchService,
    JwtStrategyService,
    RolesGuard,
    { provide: APP_FILTER, useClass: CatchExceptionsFilter },
  ],
})
export class ProviderServiceModule {}
