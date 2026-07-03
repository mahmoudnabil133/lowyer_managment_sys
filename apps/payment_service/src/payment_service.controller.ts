import { Controller, Get, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { PaymentServiceService } from './payment_service.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { ICheckoutPayload } from './types';
import * as express from 'express';
@Controller('payment')
export class PaymentServiceController {
  constructor(private readonly paymentServiceService: PaymentServiceService) { }

  @MessagePattern('payment.create_checkout')
  async handleCreateCheckout(@Payload() data: ICheckoutPayload) {
    return await this.paymentServiceService.createCheckout(data);
  }

  @Post('webhook')
  async handleStripeWebhook(@Req() req: express.Request, @Res() res: express.Response) {
    const signature = req.headers['stripe-signature'] as string;

    // Stripe requires the raw body string to securely compute and verify the signature hash
    const rawBody = (req as any).rawBody || req.body;

    try {
      console.log('webhook called');

      await this.paymentServiceService.handleWebhook(signature, rawBody);
      return res.status(HttpStatus.OK).send({ received: true });
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${err.message}`);
    }
  }
}
