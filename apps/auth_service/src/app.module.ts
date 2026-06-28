import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { APP_FILTER } from '@nestjs/core';
import { CatchExceptionsFilter } from '@app/common';

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
      useFactory: function (config: ConfigService) {
        return {
          uri: config.get('Mongo_Uri'),
        };
      }
    }),

  ],
  providers: [{ provide: APP_FILTER, useClass: CatchExceptionsFilter }]
})
export class AppModule { }
