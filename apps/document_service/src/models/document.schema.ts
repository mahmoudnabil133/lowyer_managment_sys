import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document as MongoDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'documents' })
export class Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true })
  ownerRole: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  sizeBytes: number;

  @Prop({ required: true })
  cloudinaryUrl: string;

  @Prop({ required: true })
  cloudinaryPublicId: string;

  @Prop({
    type: String,
    enum: ['policy', 'faq', 'case_file', 'intake_form', 'contract', 'other'],
    default: 'other',
  })
  category: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Types.ObjectId })
  linkedProviderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  linkedAppointmentId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending',
  })
  extractionStatus: string;
}

export const DocumentSchema = SchemaFactory.createForClass(Document);

DocumentSchema.index({ ownerId: 1, createdAt: -1 });
DocumentSchema.index({ category: 1 });
DocumentSchema.index({ tags: 1 });

export type DocumentDocument = Document & MongoDocument;
