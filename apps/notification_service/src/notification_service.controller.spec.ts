import { Test, TestingModule } from '@nestjs/testing';
import { NotificationServiceController } from './notification_service.controller';
import { NotificationServiceService } from './notification_service.service';

describe('NotificationServiceController', () => {
  let notificationServiceController: NotificationServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [NotificationServiceController],
      providers: [NotificationServiceService],
    }).compile();

    notificationServiceController = app.get<NotificationServiceController>(NotificationServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(notificationServiceController.getHello()).toBe('Hello World!');
    });
  });
});
