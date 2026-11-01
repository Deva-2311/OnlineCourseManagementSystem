/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentStatus } from './enums/payment-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: any;

  const mockUser: Partial<User> = {
    id: 'student-uuid-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
  };

  beforeEach(async () => {
    service = {
      createCheckoutSession: jest.fn().mockResolvedValue({
        paymentId: 'payment-1',
        checkoutSessionId: 'cs_123',
        checkoutUrl: 'https://stripe.com/checkout',
        amount: 29.99,
        currency: 'USD',
        status: PaymentStatus.PENDING,
      }),
      handleWebhook: jest.fn().mockResolvedValue({ received: true }),
      getPaymentById: jest.fn().mockResolvedValue({
        id: 'payment-1',
        amount: 29.99,
        currency: 'USD',
        status: PaymentStatus.SUCCEEDED,
      }),
      reconcilePaymentSession: jest.fn().mockResolvedValue({
        id: 'payment-1',
        amount: 29.99,
        currency: 'USD',
        status: PaymentStatus.SUCCEEDED,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: service }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should delegate to paymentsService.createCheckoutSession', async () => {
      const result = await controller.createCheckoutSession(
        mockUser as User,
        { courseId: '123e4567-e89b-12d3-a456-426614174000' },
      );

      expect(service.createCheckoutSession).toHaveBeenCalledWith(
        'student-uuid-1',
        'student@example.com',
        '123e4567-e89b-12d3-a456-426614174000',
      );
      expect(result.checkoutSessionId).toBe('cs_123');
    });
  });

  describe('handleWebhook', () => {
    it('should throw BadRequestException if signature is missing', async () => {
      await expect(
        controller.handleWebhook('', { rawBody: Buffer.from('test') }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if rawBody is missing', async () => {
      await expect(
        controller.handleWebhook('sig_123', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delegate to service.handleWebhook when signature and rawBody are present', async () => {
      const rawBody = Buffer.from('valid payload');
      const result = await controller.handleWebhook('sig_123', { rawBody });

      expect(service.handleWebhook).toHaveBeenCalledWith('sig_123', rawBody);
      expect(result.received).toBe(true);
    });
  });

  describe('getPaymentById', () => {
    it('should delegate to service.getPaymentById', async () => {
      const result = await controller.getPaymentById(mockUser as User, 'payment-1');
      expect(service.getPaymentById).toHaveBeenCalledWith(
        'payment-1',
        'student-uuid-1',
        UserRole.STUDENT,
      );
      expect(result.id).toBe('payment-1');
    });
  });

  describe('reconcilePaymentSession', () => {
    it('should delegate to service.reconcilePaymentSession', async () => {
      const result = await controller.reconcilePaymentSession(mockUser as User, 'payment-1');
      expect(service.reconcilePaymentSession).toHaveBeenCalledWith(
        'payment-1',
        'student-uuid-1',
      );
      expect(result.status).toBe(PaymentStatus.SUCCEEDED);
    });
  });
});
