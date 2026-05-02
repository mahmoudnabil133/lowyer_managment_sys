import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Mongoose } from 'mongoose';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ApiModule } from './common/api-filter/api-filter.module';
import { APP_FILTER } from '@nestjs/core';
import { CatchExceptionsFilter } from './common/global.filter';
import { RmqModule } from '@app/rmq';

@Module({
  imports: [UserModule, AuthModule,
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: '.env'
  }),
    JwtModule.register({
      global: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: function (config: ConfigService){
        return {
          uri: config.get('Mongo_Uri'),
        };
      }
    }),
    
  ],
  providers: [{provide: APP_FILTER, useClass: CatchExceptionsFilter}]
})
export class AppModule {}
