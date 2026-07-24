import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

@Schema({ _id: false })
class Credential {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  issuingOrganization: string;

  @Prop({ required: true })
  year: number;

  @Prop()
  documentUrl: string;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ type: Types.ObjectId })
  verifiedBy: Types.ObjectId;

  @Prop()
  verifiedAt: Date;
}

@Schema({ _id: false })
class Location {
  @Prop()
  address: string;

  @Prop()
  city: string;

  @Prop()
  lat: number;

  @Prop()
  lng: number;
}

@Schema({ _id: false })
class Earnings {
  @Prop({ default: 0 })
  totalEarned: number;

  @Prop({ default: 0 })
  pendingPayouts: number;

  @Prop({ default: 0 })
  lifetime: number;
}

@Schema({ timestamps: true, collection: 'provider_profiles' })
export class ProviderProfile {
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  fullName: string;

  @Prop()
  photoUrl: string;

  @Prop({ maxlength: 1000 })
  bio: string;

  @Prop({ type: [String], index: true })
  specializations: string[];

  @Prop({ type: [String] })
  languages: string[];

  @Prop({ type: [Credential], default: [] })
  credentials: Credential[];

  @Prop({ type: Location })
  location: Location;

  @Prop()
  contactPhone: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: 0 })
  averageRating: number;

  @Prop({ default: 0 })
  totalReviews: number;

  @Prop({ type: Earnings, default: () => ({}) })
  earnings: Earnings;
}

export const ProviderProfileSchema =
  SchemaFactory.createForClass(ProviderProfile);

// Text index for search
ProviderProfileSchema.index({
  fullName: 'text',
  bio: 'text',
  specializations: 'text',
});

// Compound index for listing/sorting
ProviderProfileSchema.index({ specializations: 1, isVerified: 1 });
ProviderProfileSchema.index({ averageRating: -1 });
ProviderProfileSchema.index({ 'location.city': 1 });

export type ProviderProfileDocument = ProviderProfile & Document;
