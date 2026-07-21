import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TextExtractionService {
    private readonly logger = new Logger(TextExtractionService.name);


    async extractText(buffer: Buffer): Promise<string> {
        const pdf = require('pdf-parse');
        const data = await pdf(buffer);
        return data.text;
    }
}