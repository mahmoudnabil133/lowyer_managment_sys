import { Test, TestingModule } from '@nestjs/testing';
import { PaymentServiceController } from './payment_service.controller';
import { PaymentServiceService } from './payment_service.service';

describe('PaymentServiceController', () => {
  let paymentServiceController: PaymentServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PaymentServiceController],
      providers: [PaymentServiceService],
    }).compile();

    paymentServiceController = app.get<PaymentServiceController>(
      PaymentServiceController,
    );
  });
});
