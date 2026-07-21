import { Controller, Get } from '@nestjs/common';
import { DocumentServiceService } from './document_service.service';

@Controller()
export class DocumentServiceController {
  constructor(private readonly documentServiceService: DocumentServiceService) {}

  @Get()
  getHello(): string {
    return this.documentServiceService.getHello();
  }
}
