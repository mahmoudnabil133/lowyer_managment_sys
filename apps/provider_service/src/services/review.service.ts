import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProviderReview } from '../models/provider-review.schema';
import { ProviderProfile } from '../models/provider-profile.schema';
import { CreateReviewDto } from '../dtos/review.dto';
import { ApiFeatureService } from '@app/common';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(ProviderReview.name)
    private readonly reviewModel: Model<ProviderReview>,
    @InjectModel(ProviderProfile.name)
    private readonly profileModel: Model<ProviderProfile>,
  ) {}

  async create(providerId: string, patientId: string, dto: CreateReviewDto) {
    // Check if provider exists
    const profile = await this.profileModel.findOne({
      userId: new Types.ObjectId(providerId),
    });
    console.log(profile);
    if (!profile) throw new NotFoundException('Provider not found');

    // Check if already reviewed this appointment
    const existing = await this.reviewModel.findOne({
      appointmentId: new Types.ObjectId(dto.appointmentId),
    });
    console.log(existing);

    if (existing)
      throw new BadRequestException(
        'This appointment has already been reviewed',
      );

    const review = await this.reviewModel.create({
      providerId: new Types.ObjectId(providerId),
      patientId: new Types.ObjectId(patientId),
      appointmentId: new Types.ObjectId(dto.appointmentId),
      rating: dto.rating,
      comment: dto.comment,
    });

    // Recompute average rating
    await this.recomputeRating(providerId);

    return review;
  }

  async findByProvider(providerId: string, query: any) {
    const filter = {
      providerId: new Types.ObjectId(providerId),
    };
    const features = new ApiFeatureService(query, this.reviewModel, filter)
      .filter()
      .sort()
      .select()
      .paginate();
    return features.execute();
  }

  private async recomputeRating(providerId: string) {
    const stats = await this.reviewModel.aggregate([
      { $match: { providerId: new Types.ObjectId(providerId) } },
      {
        $group: {
          _id: '$providerId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await this.profileModel.findByIdAndUpdate(providerId, {
        $set: {
          averageRating: Math.round(stats[0].averageRating * 10) / 10,
          totalReviews: stats[0].totalReviews,
        },
      });
    }
  }
}
