import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum DayOfWeek {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
}

@Schema({ _id: false })
export class TimeWindow {
  @Prop({ required: true, match: /^[0-2][0-9]:[0-5][0-9]$/ })
  startTime: string;

  @Prop({ required: true, match: /^[0-2][0-9]:[0-5][0-9]$/ })
  endTime: string;
}

@Schema({ _id: false })
export class DaySchedule {
  @Prop({ type: Number, required: true, enum: DayOfWeek })
  dayOfWeek: DayOfWeek;

  @Prop({ required: true })
  isWorking: boolean;

  @Prop({ type: [TimeWindow], default: [] })
  windows: TimeWindow[];
}

@Schema({ timestamps: true, collection: 'provider_schedules' })
export class ProviderSchedule {
  @Prop({ required: true, type: Types.ObjectId, unique: true, index: true })
  providerId: Types.ObjectId; // docter/user

  @Prop({ type: [DaySchedule], default: [] })
  weeklySchedule: DaySchedule[];

  @Prop({ required: true, default: 30 })
  slotDurationMinutes: number;

  @Prop({ required: true, default: 5 })
  bufferMinutes: number;

  @Prop({ required: true, default: 1 })
  maxConcurrentAppointments: number;

  @Prop({ required: true, default: 14 })
  advanceBookingDays: number;

  @Prop({ required: true, default: 2 })
  minAdvanceBookingHours: number;

  @Prop({ type: [String], default: [] })
  blockDates: string[];

  @Prop({ required: true, default: 1000 })
  appointmentPrice: number;

  @Prop({ required: true, default: 'EGP' })
  currency: string;

  @Prop({ required: true, default: 'UTC' })
  timezone: string;

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export type ProviderScheduleDocument = ProviderSchedule & Document;
export const providerScheduleSchema =
  SchemaFactory.createForClass(ProviderSchedule);
