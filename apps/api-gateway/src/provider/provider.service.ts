import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { PROVIDER_PATTERNS } from '@app/common';

@Injectable()
export class ProviderService {
  constructor(@Inject('PROVIDER_SERVICE') private client: ClientProxy) {}

  async getList(query: any) {
    return lastValueFrom(this.client.send(PROVIDER_PATTERNS.GET_LIST, query));
  }

  async getById(id: string) {
    return lastValueFrom(this.client.send(PROVIDER_PATTERNS.GET_BY_ID, { id }));
  }

  async createMe(userId: string, dto: any) {
    return lastValueFrom(
      this.client.send(PROVIDER_PATTERNS.CREATE_ME, { userId, dto }),
    );
  }

  async update(id: string, userId: string, dto: any) {
    return lastValueFrom(
      this.client.send(PROVIDER_PATTERNS.UPDATE, { id, userId, dto }),
    );
  }

  async createReview(providerId: string, patientId: string, dto: any) {
    return lastValueFrom(
      this.client.send(PROVIDER_PATTERNS.CREATE_REVIEW, {
        providerId,
        patientId,
        dto,
      }),
    );
  }

  async getReviews(providerId: string, query: any) {
    return lastValueFrom(
      this.client.send(PROVIDER_PATTERNS.GET_REVIEWS, { providerId, query }),
    );
  }

  async search(query: any) {
    return lastValueFrom(this.client.send(PROVIDER_PATTERNS.SEARCH, query));
  }

  async listUnverifiedCredentials() {
    return lastValueFrom(
      this.client.send(PROVIDER_PATTERNS.LIST_UNVERIFIED_CREDENTIALS, {}),
    );
  }

  async verifyCredential(
    profileId: string,
    credId: string,
    adminUserId: string,
  ) {
    return lastValueFrom(
      this.client.send(PROVIDER_PATTERNS.VERIFY_CREDENTIAL, {
        profileId,
        credId,
        adminUserId,
      }),
    );
  }
}
