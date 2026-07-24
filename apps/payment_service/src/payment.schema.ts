// payment.schema.ts (Inside Payment Microservice)
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentStatus } from './types';

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  appointmentId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  bookingRef: string;

  @Prop({ type: Types.ObjectId, required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  providerId: Types.ObjectId;

  @Prop({ index: true })
  stripePaymentIntentId?: string;

  @Prop({ required: true })
  stripeCheckoutSessionId: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ default: 'EGP' })
  currency: string;

  @Prop({
    type: String,
    required: true,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    index: true,
  })
  status: PaymentStatus;

  @Prop({ default: null })
  stripeRefundId?: string;

  @Prop({ type: Number, default: 0 })
  refundAmount: number;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

@Schema({ timestamps: true, collection: 'payment_events' })
export class PaymentEvent {
  @Prop({ required: true, unique: true })
  eventId: string; // stripe event ID to enforce idempotency at webhook level

  @Prop({ required: true })
  type: string; // e.g., checkout.session.completed

  @Prop({ type: Object, required: true })
  payload: any;
}

export const PaymentEventSchema = SchemaFactory.createForClass(PaymentEvent);
