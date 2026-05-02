import { Module } from '@nestjs/common';
import { MailerService } from './nodemailer.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ConfigModule } from '@nestjs/config';

@Module({

  providers: [
    MailerService,
    {
      provide: 'TRANSPORTER',
      useFactory: function (config: ConfigService) {
        return nodemailer.createTransport({
          host: config.get('host'),
          port: config.get('smtp_port'),
          secure: config.get('secure'),
          auth: {
            user: config.get('user'),
            pass: config.get('pass'),
          },
          connectionTimeout: 5000,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [MailerService],
})
export class MailerModule {}
