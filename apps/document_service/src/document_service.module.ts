import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { CatchExceptionsFilter } from '@app/common';
import { RmqModule } from '@app/rmq';

import { Document, DocumentSchema } from './models/document.schema';

import { DocumentRpcController } from './rpc/document.rpc.controller';

import { DocumentService } from './services/document.service';
import { UploadService } from './services/upload.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.get('Mongo_Uri') }),
    }),
    MongooseModule.forFeature([
      { name: Document.name, schema: DocumentSchema },
    ]),
    RmqModule.forRoot(),
    RmqModule.register({ name: 'AI_SERVICE', queue: 'ai_queue' }),
  ],
  controllers: [DocumentRpcController],
  providers: [
    DocumentService,
    UploadService,
    { provide: APP_FILTER, useClass: CatchExceptionsFilter },
  ],
})
export class DocumentServiceModule {}
