import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { DOCUMENT_PATTERNS } from '@app/common';

@Injectable()
export class DocumentService {
  constructor(@Inject('DOCUMENT_SERVICE') private client: ClientProxy) {}

  async create(userId: string, userRole: string, file: any, dto: any) {
    return lastValueFrom(
      this.client.send(DOCUMENT_PATTERNS.CREATE, {
        ownerId: userId,
        ownerRole: userRole,
        file,
        dto,
      }),
    );
  }

  async getById(documentId: string) {
    return lastValueFrom(
      this.client.send(DOCUMENT_PATTERNS.GET, { documentId }),
    );
  }

  async list(query: any) {
    return lastValueFrom(this.client.send(DOCUMENT_PATTERNS.LIST, { query }));
  }

  async update(documentId: string, dto: any) {
    return lastValueFrom(
      this.client.send(DOCUMENT_PATTERNS.UPDATE, { documentId, dto }),
    );
  }

  async delete(documentId: string) {
    return lastValueFrom(
      this.client.send(DOCUMENT_PATTERNS.DELETE, { documentId }),
    );
  }

  async download(documentId: string) {
    return lastValueFrom(
      this.client.send(DOCUMENT_PATTERNS.DOWNLOAD, { documentId }),
    );
  }
}
