import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { AI_PATTERNS } from '@app/common';

@Injectable()
export class AiService {
  constructor(@Inject('AI_SERVICE') private client: ClientProxy) {}

  async chat(message: string, filters?: Record<string, any>) {
    return lastValueFrom(
      this.client.send(AI_PATTERNS.CHAT, { message, filters }),
    );
  }
}
