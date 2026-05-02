import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RmqContext, RmqOptions, Transport } from '@nestjs/microservices';

@Injectable()
export class RmqService {
    constructor(private readonly configService: ConfigService) {}
        
    getOptions(queue: string, noAck = false) :RmqOptions{
        return {
            transport:Transport.RMQ,
            options:{
                urls:[this.configService.getOrThrow<string>('RMQ_URL')],
                queue,
                noAck,
                queueOptions:{durable:true},
                socketOptions:{
                    heartbeatIntervalInSeconds:60,
                    reconnectTimeInSeconds:5,
                }
            }
        }
    }
    ack(context:RmqContext){
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        channel.ack(originalMsg);
    }
}
