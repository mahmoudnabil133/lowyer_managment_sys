import { Controller, Get } from '@nestjs/common';
import { AiServiceService } from './ai_service.service';

@Controller()
export class AiServiceController {
  constructor(private readonly aiServiceService: AiServiceService) {}

  @Get()
  getHello(): string {
    return this.aiServiceService.getHello();
  }
}
