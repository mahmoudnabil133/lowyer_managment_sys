import { Controller, UseFilters, Logger, Inject } from '@nestjs/common';
import {
  EventPattern,
  MessagePattern,
  Payload,
  RpcException,
  ClientProxy,
} from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import {
  AI_DOCUMENT_EVENTS,
  AI_PATTERNS,
  DOCUMENT_PATTERNS,
} from '@app/common/constants/rmq-patterns';
import { CatchExceptionsFilter } from '@app/common';
import { RagService } from '../services/rag.service';

interface ChatPayload {
  message: string;
  filters?: {
    appointmentId?: string;
    providerId?: string;
    category?: string;
    documentIds?: string[];
  };
}

@UseFilters(CatchExceptionsFilter)
@Controller()
export class AiRpcController {
  private readonly logger = new Logger(AiRpcController.name);

  constructor(
    private readonly ragService: RagService,
    @Inject('DOCUMENT_SERVICE') private readonly documentClient: ClientProxy,
  ) {}

  @EventPattern(AI_DOCUMENT_EVENTS.DOCUMENT_CREATED)
  async handleDocumentCreated(
    @Payload()
    data: {
      documentId: string;
      cloudinaryUrl: string;
      cloudinaryPublicId: string;
      fileName: string;
      mimeType: string;
      category?: string;
      tags?: string[];
      linkedAppointmentId?: string;
      linkedProviderId?: string;
    },
  ) {
    try {
      this.logger.log(
        `Processing document ${data.documentId} for AI ingestion`,
      );
      console.log(`data to ai`, data);
      const count = await this.ragService.processDocument({
        documentId: data.documentId,
        cloudinaryUrl: data.cloudinaryUrl,
        fileName: data.fileName,
        category: data.category,
        tags: data.tags,
        linkedAppointmentId: data.linkedAppointmentId,
        linkedProviderId: data.linkedProviderId,
      });
      this.logger.log(
        `Ingested ${count} chunks for document ${data.documentId}`,
      );

      await lastValueFrom(
        this.documentClient.send(DOCUMENT_PATTERNS.UPDATE_EXTRACTION_STATUS, {
          documentId: data.documentId,
          extractionStatus: 'processed',
        }),
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to process document ${data.documentId}: ${err.message}`,
      );

      await lastValueFrom(
        this.documentClient.send(DOCUMENT_PATTERNS.UPDATE_EXTRACTION_STATUS, {
          documentId: data.documentId,
          extractionStatus: 'failed',
        }),
      ).catch((e) =>
        this.logger.error(`Failed to report error status: ${e.message}`),
      );
    }
  }

  @EventPattern(AI_DOCUMENT_EVENTS.DOCUMENT_DELETED)
  async handleDocumentDeleted(@Payload() data: { documentId: string }) {
    try {
      this.logger.log(
        `Cleaning up chunks for deleted document ${data.documentId}`,
      );
      await this.ragService.deleteDocumentChunks(data.documentId);
    } catch (err: any) {
      this.logger.error(
        `Failed to delete chunks for document ${data.documentId}: ${err.message}`,
      );
    }
  }

  @MessagePattern(AI_PATTERNS.CHAT)
  async handleChat(@Payload() data: ChatPayload) {
    try {
      const results = await this.ragService.similaritySearch(
        data.message,
        5,
        data.filters,
      );

      if (results.length === 0) {
        return {
          answer:
            'I could not find that information in the uploaded documents.',
        };
      }

      const context = results.map((r) => r.pageContent).join('\n\n');
      const answer = await this.ragService.generateAnswer(
        data.message,
        context,
      );
      return { answer };
    } catch (err: any) {
      throw new RpcException({
        message: err.message || 'AI chat failed',
        statusCode: 500,
      });
    }
  }
}
