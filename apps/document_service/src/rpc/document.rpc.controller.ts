import { Controller, UseFilters, Inject } from '@nestjs/common';
import {
    MessagePattern,
    Payload,
    RpcException,
    ClientProxy,
} from '@nestjs/microservices';
import { DOCUMENT_PATTERNS, AI_DOCUMENT_EVENTS } from '@app/common/constants/rmq-patterns';
import { CatchExceptionsFilter } from '@app/common';
import { DocumentService } from '../services/document.service';

@UseFilters(CatchExceptionsFilter)
@Controller()
export class DocumentRpcController {
    constructor(
        private readonly documentService: DocumentService,
        @Inject('AI_SERVICE') private readonly aiClient: ClientProxy,
    ) { }

    private handleRpcError(err: any) {
        throw new RpcException({
            message: err.message || 'Internal error occurred in document service',
            statusCode: err.status || err.statusCode || 500,
        });
    }

    @MessagePattern(DOCUMENT_PATTERNS.CREATE)
    async create(
        @Payload()
        data: {
            ownerId: string;
            ownerRole: string;
            file: any;
            dto: any;
        },
    ) {
        try {
            const doc = await this.documentService.create(
                data.ownerId,
                data.ownerRole,
                data.file,
                data.dto,
            );

            this.aiClient.emit(AI_DOCUMENT_EVENTS.DOCUMENT_CREATED, {
                documentId: doc._id.toString(),
                ownerId: data.ownerId,
                extractedText: doc.extractedText,
                category: doc.category,
                tags: doc.tags,
            });

            return doc;
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern(DOCUMENT_PATTERNS.GET)
    async get(@Payload() data: { documentId: string }) {
        try {
            return await this.documentService.findById(data.documentId);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern(DOCUMENT_PATTERNS.LIST)
    async list(@Payload() data: { query: any }) {
        try {
            return await this.documentService.list(data.query);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern(DOCUMENT_PATTERNS.UPDATE)
    async update(
        @Payload()
        data: { documentId: string; dto: any },
    ) {
        try {
            return await this.documentService.update(
                data.documentId,
                data.dto,
            );
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern(DOCUMENT_PATTERNS.DELETE)
    async delete(@Payload() data: { documentId: string }) {
        try {
            const result = await this.documentService.delete(data.documentId);

            this.aiClient.emit(AI_DOCUMENT_EVENTS.DOCUMENT_DELETED, {
                documentId: data.documentId,
            });

            return result;
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern(DOCUMENT_PATTERNS.DOWNLOAD)
    async download(@Payload() data: { documentId: string }) {
        try {
            return await this.documentService.getDownloadUrl(data.documentId);
        } catch (err) {
            this.handleRpcError(err);
        }
    }
}
