import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProviderProfile } from '../models/provider-profile.schema';
import { SearchProviderDto } from '../dtos/profile.dto';

@Injectable()
export class SearchService {
    constructor(
        @InjectModel(ProviderProfile.name)
        private readonly profileModel: Model<ProviderProfile>,
    ) { }

    async search(dto: SearchProviderDto) {
        const filter: any = {};
        const {
            specialization,
            minRating,
            city,
            language,
            isVerified,
            sort,
            page = 1,
            limit = 10,
        } = dto;

        if (specialization) {
            filter.specializations = { $in: [new RegExp(specialization, 'i')] };
        }

        if (minRating) {
            filter.averageRating = { $gte: minRating };
        }

        if (city) {
            filter['location.city'] = new RegExp(city, 'i');
        }

        if (language) {
            filter.languages = { $in: [new RegExp(language, 'i')] };
        }

        if (isVerified !== undefined) {
            filter.isVerified = isVerified;
        }

        // Sort
        let sortOption: any = { averageRating: -1 };
        if (sort === 'totalReviews') sortOption = { totalReviews: -1 };
        if (sort === 'createdAt') sortOption = { createdAt: -1 };
        if (sort === 'rating') sortOption = { averageRating: -1 };

        const skip = (page - 1) * limit;
        const cappedLimit = Math.min(limit, 50);

        const [data, total] = await Promise.all([
            this.profileModel
                .find(filter)
                .sort(sortOption)
                .skip(skip)
                .limit(cappedLimit)
                .lean(),
            this.profileModel.countDocuments(filter),
        ]);

        return {
            results: data.length,
            totalDocuments: total,
            currentPage: page,
            totalPages: Math.ceil(total / cappedLimit),
            data,
        };
    }
}