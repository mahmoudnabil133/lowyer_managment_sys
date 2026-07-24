import { DynamicModule, Module } from '@nestjs/common';
import { RmqService } from './rmq.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
export interface RmqOprions {
  name: string;
  queue: string;
}
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [RmqService],
  exports: [RmqService],
})
export class RmqModule {
  static register({ name, queue }: RmqOprions) {
    return {
      module: RmqModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name,
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
              transport: Transport.RMQ,
              options: {
                urls: [configService.getOrThrow<string>('RMQ_URL')],
                queue,
                queueOptions: { durable: true },
              },
            }),
            inject: [ConfigService],
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }

  static forRoot(): DynamicModule {
    return {
      module: RmqModule,
      providers: [RmqService],
      exports: [RmqService],
    };
  }
}
