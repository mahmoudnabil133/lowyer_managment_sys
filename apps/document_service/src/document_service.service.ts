import { Injectable } from '@nestjs/common';

@Injectable()
export class DocumentServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
