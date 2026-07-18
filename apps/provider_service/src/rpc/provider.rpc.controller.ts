import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { PROVIDER_PATTERNS } from '@app/common';
import { ProfileService } from '../services/profile.service';
import { ReviewService } from '../services/review.service';
import { SearchService } from '../services/search.service';

@Controller()
export class ProviderRpcController {
    constructor(
        private readonly profileService: ProfileService,
        private readonly reviewService: ReviewService,
        private readonly searchService: SearchService,
    ) { }

    private handleRpcError(err: any) {
        throw new RpcException({
            message: err.message || 'Internal error occurred in provider service',
            statusCode: err.status || err.statusCode || 500,
        });
    }

    // ─── Profile ───

    @MessagePattern(PROVIDER_PATTERNS.GET_LIST)
    async getList(@Payload() query: any) {
        try {
            return await this.profileService.list(query);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern(PROVIDER_PATTERNS.GET_BY_ID)
    async getById(@Payload() data: { id: string }) {
        try {
            return await this.profileService.findById(data.id);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern(PROVIDER_PATTERNS.CREATE_ME)
    async createMe(@Payload() data: { userId: string; dto: any }) {
        try {
            return await this.profileService.create(data.userId, data.dto);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern(PROVIDER_PATTERNS.UPDATE)
    async update(@Payload() data: { id: string; userId: string; dto: any }) {
        try {
            return await this.profileService.update(data.id, data.userId, data.dto);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    // ─── Reviews ───

    @MessagePattern(PROVIDER_PATTERNS.CREATE_REVIEW)
    async createReview(
        @Payload() data: { providerId: string; patientId: string; dto: any },
    ) {
        try {
            return await this.reviewService.create(data.providerId, data.patientId, data.dto);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern(PROVIDER_PATTERNS.GET_REVIEWS)
    async getReviews(@Payload() data: { providerId: string; query: any }) {
        try {
            return await this.reviewService.findByProvider(data.providerId, data.query);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    // ─── Search ───

    @MessagePattern(PROVIDER_PATTERNS.SEARCH)
    async search(@Payload() dto: any) {
        try {
            return await this.searchService.search(dto);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    // ─── Admin ───

    @MessagePattern(PROVIDER_PATTERNS.VERIFY_CREDENTIAL)
    async verifyCredential(
        @Payload() data: { profileId: string; credId: string; adminUserId: string },
    ) {
        try {
            return await this.profileService.verifyCredential(
                data.profileId,
                data.credId,
                data.adminUserId,
            );
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern(PROVIDER_PATTERNS.LIST_UNVERIFIED_CREDENTIALS)
    async listUnverified() {
        try {
            return await this.profileService.listUnverifiedCredentials();
        } catch (err) {
            this.handleRpcError(err);
        }
    }
}
