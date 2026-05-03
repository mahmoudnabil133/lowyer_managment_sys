import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AppointmentStatus } from './appointment.schema';

/**
 * AppointmentHistory — immutable audit trail.
 *
 * CRITICAL DESIGN PRINCIPLES:
 * 1. NEVER update — only insert new records
 * 2. Each status transition creates ONE record
 * 3. Provides full accountability for compliance (HIPAA, GDPR, etc.)
 * 4. Helps debug issues and reconstruct timelines
 */
@Schema({ collection: 'appointment_history' })
export class AppointmentHistory {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  appointmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  providerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  patientId: Types.ObjectId;

  @Prop({ enum: AppointmentStatus })
  fromStatus?: AppointmentStatus;

  @Prop({ required: true, enum: AppointmentStatus })
  toStatus: AppointmentStatus;

  // Who triggered this change?
  @Prop({ type: Types.ObjectId, required: true })
  changedByUserId: Types.ObjectId;

  @Prop({ required: true })
  changedByRole: string; //

  // Why did it change? (Free text reason)
  @Prop()
  note: string;

  // Technical metadata (IP address, user agent, etc.)
  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ required: true, default: () => new Date() })
  createdAt: Date;
}

export const AppointmentHistorySchema =
  SchemaFactory.createForClass(AppointmentHistory);

// Index for fast chronological queries on a single appointment
AppointmentHistorySchema.index({ appointmentId: 1, createdAt: 1 });
export type AppointmentHistoryDocument = AppointmentHistory & Document;
