import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum SlotStatus {
  AVAILABLE = 'available',
  BOOKED = 'booked',
  BLOCKED = 'blocked',
  HOLD = 'hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true, collection: 'time_slots' })
export class TimeSlot {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  providerId: Types.ObjectId;

  @Prop({ required: true, index: true })
  date: string; // ISO date string

  @Prop({ required: true })
  startTime: Date; // utc

  @Prop({ required: true })
  endTime: Date; // utc

  @Prop({ required: true })
  durationMinutes: number;

  @Prop({
    type: String,
    required: true,
    enum: SlotStatus,
    default: SlotStatus.AVAILABLE,
    index: true,
  })
  status: SlotStatus;

  // if booked or on hold
  @Prop({ type: Types.ObjectId })
  appointmentId?: Types.ObjectId; // reference to appointment

  @Prop({ type: Types.ObjectId })
  holdBy?: Types.ObjectId;

  @Prop({ type: Date })
  heldExpireDate?: Date;

  @Prop({ default: 0 })
  bookedCount: number;

  @Prop({ default: 1 })
  maxBookings: number;
}

export const TimeSlotSchema = SchemaFactory.createForClass(TimeSlot);

export type TimeSlotDocument = TimeSlot & Document;

// #for search# find available slots for a provider(doctor) on a date ..
TimeSlotSchema.index({ providerId: 1, date: 1, status: 1 });
// #avoid overlap# to prevent overlapping (dublication (same time and same doctor so its uniqueue))
TimeSlotSchema.index({ providerId: 1, startTime: 1 }, { unique: true });

// Auto-delete expired holds (MongoDB TTL - optional safety net)
TimeSlotSchema.index(
  { heldExpireDate: 1 },
  { expireAfterSeconds: 0, sparse: true },
);

TimeSlotSchema.virtual('isAvailable').get(function () {
  return (
    this.status === SlotStatus.AVAILABLE && this.bookedCount < this.maxBookings
  );
});
