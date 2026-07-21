import { Test, TestingModule } from '@nestjs/testing';
import { DocumentServiceController } from './document_service.controller';
import { DocumentServiceService } from './document_service.service';

describe('DocumentServiceController', () => {
  let documentServiceController: DocumentServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DocumentServiceController],
      providers: [DocumentServiceService],
    }).compile();

    documentServiceController = app.get<DocumentServiceController>(DocumentServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(documentServiceController.getHello()).toBe('Hello World!');
    });
  });
});
