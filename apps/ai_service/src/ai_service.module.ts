import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import { CatchExceptionsFilter } from '@app/common';
import { RmqModule } from '@app/rmq';

import { AiServiceController } from './ai_service.controller';
import { AiRpcController } from './rpc/ai.rpc.controller';
import { RagService } from './services/rag.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    RmqModule.forRoot(),
    RmqModule.register({ name: 'DOCUMENT_SERVICE', queue: 'document_queue' }),
    HttpModule.register({}),
  ],
  controllers: [AiRpcController],
  providers: [
    RagService,
    { provide: APP_FILTER, useClass: CatchExceptionsFilter },
  ],
})
export class AiServiceModule {}
