import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'provider_reviews' })
export class ProviderReview {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  providerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, unique: true })
  appointmentId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ maxlength: 500 })
  comment: string;
}

export const ProviderReviewSchema =
  SchemaFactory.createForClass(ProviderReview);
ProviderReviewSchema.index({ providerId: 1, createdAt: -1 });

export type ProviderReviewDocument = ProviderReview & Document;
