export interface ICheckoutPayload {
  appointmentId: string;
  bookingRef: string;
  patientId: string;
  providerId: string;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
}
