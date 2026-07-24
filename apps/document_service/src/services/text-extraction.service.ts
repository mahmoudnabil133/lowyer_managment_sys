import { Injectable, Logger } from '@nestjs/common';
import { Buffer } from 'buffer';

@Injectable()
export class TextExtractionService {
  private readonly logger = new Logger(TextExtractionService.name);

  async extractText(buffer: Buffer): Promise<string> {
    if (!Buffer.isBuffer(buffer)) {
      if (
        buffer &&
        (buffer as any).type === 'Buffer' &&
        Array.isArray((buffer as any).data)
      ) {
        buffer = Buffer.from((buffer as any).data);
      } else {
        this.logger.warn('Received non-buffer input for text extraction');
        return '';
      }
    }

    try {
      const { PDFParse } = require('pdf-parse');
      const pp = new PDFParse();
      await pp.load(buffer);
      const text = await pp.getText();
      return text;
    } catch (err: any) {
      this.logger.error(`Text extraction failed: ${err.message}`);
      return '';
    }
  }
}