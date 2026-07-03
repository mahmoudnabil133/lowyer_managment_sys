import { Inject, Injectable, Logger } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { Payment, PaymentEvent } from './payment.schema';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { PaymentStatus, type ICheckoutPayload } from './types';
import Stripe from 'stripe';
@Injectable()
export class PaymentServiceService {
  private readonly logger = new Logger(PaymentServiceService.name);
  constructor(
    private readonly stripe: Stripe,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @InjectModel(PaymentEvent.name) private readonly eventModel: Model<PaymentEvent>,
    private readonly configService: ConfigService,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy, // RMQ Client
  ) { }
  async createCheckout(data: ICheckoutPayload) {
    const idempotencyKey = `${data.bookingRef}`;
    try {
      const session = await this.stripe.checkout.sessions.create(
        {
          line_items: [
            {
              price_data: {
                currency: data.currency.toLowerCase(),
                product_data: {
                  name: `Medical Consultation Ref: ${data.bookingRef}`,
                },
                unit_amount: Math.round(data.amount * 100), // Converted to cents/piasters safely
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          metadata: {
            appointmentId: data.appointmentId,
            bookingRef: data.bookingRef,
            patientId: data.patientId,
            providerId: data.providerId,
          },
          success_url: data.successUrl,
          cancel_url: data.cancelUrl,
        },
        { idempotencyKey }, // Attached explicitly
      );

      await this.paymentModel.create({
        appointmentId: new Types.ObjectId(data.appointmentId),
        bookingRef: data.bookingRef,
        patientId: new Types.ObjectId(data.patientId),
        providerId: new Types.ObjectId(data.providerId),
        stripeCheckoutSessionId: session.id,
        amount: data.amount,
        currency: data.currency,
        status: PaymentStatus.PENDING,
      });

      return { url: session.url };
    } catch (error) {
      this.logger.error(`Checkout initialization failed for ${data.bookingRef}: ${error.message}`); throw error;
    }
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.error('Stripe webhook secret is not configured');
      throw new Error('Internal Server Error');
    }
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      throw new Error('Invalid webhook signature');
    }

    const exists = await this.eventModel.findOne({ eventId: event.id });
    if (exists) {
      this.logger.warn(`Duplicate webhook event received: ${event.id}`);
      return { status: 'success' };
    }
    const paymentEvent = new this.eventModel({
      eventId: event.id,
      type: event.type,
      payload: event.data.object,
    });
    await paymentEvent.save();

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutSessionCompleted(session);
        break;
      default:
        this.logger.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const meta = session.metadata;
    if (!meta || !meta.bookingRef) {
      this.logger.error(`Session ${session.id} completely missing essential tracking metadata blocks.`);
      return;
    }
    this.logger.log(`Checkout processing confirmed for Reference Key: ${meta.bookingRef}`);

    const payment = await this.paymentModel.findOneAndUpdate(
      { bookingRef: meta.bookingRef },
      {
        $set: {
          status: PaymentStatus.COMPLETED,
          stripePaymentIntentId: session.payment_intent as string,
        },
      },
      { new: true },
    );

    if (!payment) {
      this.logger.error(`Payment row with Reference: ${meta.bookingRef} not found in database.`);
      return;
    }
    this.bookingClient.emit('payment.succeeded', {
      appointmentId: payment.appointmentId.toString(),
      bookingRef: payment.bookingRef,
      paymentId: payment._id.toString(),
      amount: payment.amount,
    });

  }
}
