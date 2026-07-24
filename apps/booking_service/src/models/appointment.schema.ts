import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in', // Patient has arrived and checked in
  IN_PROGRESS = 'in_progress', // Appointment is currently happening
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled',
}

export enum AppointmentType {
  IN_PERSON = 'in_person',
  VIRTUAL = 'virtual',
  HOME_VISIT = 'home_visit',
}

export enum CancelledBy {
  PATIENT = 'patient',
  PROVIDER = 'provider',
  SYSTEM = 'system',
}

// PATIENT INFO AS EMBEDDED DOCS (DENORMALIZED) IN APPOINTMENT DOCS FOR QUICK ACCESS
@Schema({ _id: false })
export class PatientInfo {
  @Prop({ type: Types.ObjectId, required: true })
  patientId: Types.ObjectId;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  email: string;

  @Prop()
  dateOfBirth: Date;
}

@Schema({ _id: false })
export class CancellationDetails {
  @Prop({ enum: CancelledBy, required: true })
  cancelledBy: CancelledBy;

  @Prop({ type: Types.ObjectId })
  cancelledByUserId: Types.ObjectId;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true })
  cancelledAt: Date;

  @Prop({ default: false })
  refundIssued: boolean;
}

@Schema({ _id: false })
export class RescheduleInfo {
  @Prop({ type: Types.ObjectId })
  previousSlotId: Types.ObjectId;

  @Prop()
  previousStartTime: Date;

  @Prop()
  rescheduledAt: Date;

  @Prop({ type: Types.ObjectId })
  rescheduledByUserId: Types.ObjectId;
}

@Schema({ timestamps: true, collection: 'appointments' })
export class Appointment {
  @Prop({ required: true, unique: true, index: true })
  bookingRef: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  providerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  slotId: Types.ObjectId;

  @Prop({ type: PatientInfo, required: true })
  patient: PatientInfo;

  @Prop({ required: true })
  startTime: Date;
  @Prop({ required: true })
  endTime: Date;

  @Prop({
    required: true,
    enum: AppointmentType,
    default: AppointmentType.IN_PERSON,
  })
  type: AppointmentType;

  @Prop({
    required: true,
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
    index: true,
  })
  status: AppointmentStatus;

  // midical info
  @Prop({ maxlength: 500 })
  chiefComplaint: string; // Patient's reason for visit

  @Prop({ maxlength: 2000 })
  providerNotes: string; // Provider's private notes

  @Prop({ maxlength: 2000 })
  patientNotes: string; // Patient-visible notes after appointment

  @Prop()
  meeting_link: string; //(zoom, google)

  // payment
  @Prop({ type: Types.ObjectId })
  paymentId?: Types.ObjectId;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop({ default: 'EGP' })
  currency: string;

  @Prop({ type: Number, default: 0 })
  amount: number; // The consultation fee locked at the moment of booking

  @Prop({ default: false })
  reminder24hSent: boolean;

  @Prop({ default: false })
  reminder1hSent: boolean;

  //cancellation & reschudele details

  // Optional details (only present for cancelled/rescheduled appointments)
  @Prop({ type: CancellationDetails })
  cancellation?: CancellationDetails;

  @Prop({ type: RescheduleInfo })
  reschedule?: RescheduleInfo;

  // For RESCHEDULED appointments - points to the new appointment
  @Prop({ type: Types.ObjectId })
  rescheduledToAppointmentId?: Types.ObjectId;
}
export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// indexes
// provider dash (get all appointments for a provider on a date)
AppointmentSchema.index({ providerId: 1, startTime: 1 });

// Patient history - get all past appointments for a patient
AppointmentSchema.index({ 'patient.patientId': 1, startTime: -1 });

// Status-based queries (upcoming confirmed appointments)
AppointmentSchema.index({ status: 1, startTime: 1 });

// Reminder job - find appointments needing reminders
AppointmentSchema.index({
  reminder24hSent: 1,
  reminder1hSent: 1,
  status: 1,
  startTime: 1,
});

export type AppointmentDocument = Appointment & Document;
