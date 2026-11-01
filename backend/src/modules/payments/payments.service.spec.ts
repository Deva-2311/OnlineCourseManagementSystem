/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { Course } from '../courses/entities/course.entity';
import { CourseStatus } from '../courses/enums/course-status.enum';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { UserRole } from '../users/enums/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email/email.service';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepository: any;
  let courseRepository: any;
  let enrollmentRepository: any;
  let enrollmentsService: any;
  let configService: any;
  let dataSource: any;
  let mockStripe: any;

  const mockCourse: Partial<Course> = {
    id: 'course-paid-1',
    title: 'Advanced Fullstack TypeScript',
    slug: 'advanced-fullstack-typescript',
    shortDescription: 'Master TS and NestJS',
    price: 49.99,
    currency: 'USD',
    status: CourseStatus.PUBLISHED,
  };

  const mockPayment: Partial<Payment> = {
    id: 'payment-uuid-1',
    studentId: 'student-uuid-1',
    courseId: 'course-paid-1',
    enrollmentId: 'enrollment-uuid-1',
    amount: 49.99,
    currency: 'USD',
    status: PaymentStatus.PENDING,
    stripeCheckoutSessionId: 'cs_test_session_123',
    stripePaymentIntentId: null,
    paidAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    toSafePayment: function () {
      return {
        id: this.id,
        amount: this.amount,
        currency: this.currency,
        status: this.status,
        paidAt: this.paidAt,
        createdAt: this.createdAt,
        studentId: this.studentId,
        courseId: this.courseId,
        enrollmentId: this.enrollmentId,
      } as any;
    },
  };

  const mockEnrollment: Partial<Enrollment> = {
    id: 'enrollment-uuid-1',
    studentId: 'student-uuid-1',
    courseId: 'course-paid-1',
    status: EnrollmentStatus.PENDING_PAYMENT,
    enrolledAt: null,
    completedAt: null,
  };

  beforeEach(async () => {
    paymentRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({
        ...dto,
        id: 'new-payment-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        toSafePayment: function () {
          return {
            id: this.id,
            amount: this.amount,
            currency: this.currency,
            status: this.status,
          } as any;
        },
      })),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
    };

    courseRepository = {
      findOne: jest.fn(),
    };

    enrollmentRepository = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'new-enrollment-id' })),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
    };

    enrollmentsService = {
      validatePrerequisites: jest.fn().mockResolvedValue(undefined),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'stripe.secretKey') return 'sk_test_mock_secret';
        if (key === 'stripe.webhookSecret') return 'whsec_mock_webhook_secret';
        if (key === 'stripe.successUrl') return 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}';
        if (key === 'stripe.cancelUrl') return 'http://localhost:3000/cancel?course_id={COURSE_ID}';
        return null;
      }),
    };

    dataSource = {
      transaction: jest.fn(async (callback) => {
        const manager = {
          save: jest.fn((entity) => Promise.resolve(entity)),
          update: jest.fn().mockResolvedValue({ affected: 1 }),
        };
        return callback(manager);
      }),
    };

    mockStripe = {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({
            id: 'cs_test_session_123',
            url: 'https://checkout.stripe.com/pay/cs_test_session_123',
          }),
          retrieve: jest.fn().mockResolvedValue({
            id: 'cs_test_session_123',
            payment_status: 'paid',
            amount_total: 4999,
            currency: 'usd',
            payment_intent: 'pi_test_123',
            metadata: {
              paymentId: 'payment-uuid-1',
              studentId: 'student-uuid-1',
              courseId: 'course-paid-1',
            },
          }),
        },
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: paymentRepository },
        { provide: getRepositoryToken(Course), useValue: courseRepository },
        { provide: getRepositoryToken(Enrollment), useValue: enrollmentRepository },
        { provide: EnrollmentsService, useValue: enrollmentsService },
        { provide: ConfigService, useValue: configService },
        { provide: DataSource, useValue: dataSource },
        { provide: NotificationsService, useValue: { createNotification: jest.fn().mockResolvedValue({}) } },
        { provide: EmailService, useValue: { sendMail: jest.fn().mockResolvedValue(true) } },
        { provide: AuditLogService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    service.setStripeClient(mockStripe);
  });

  describe('createCheckoutSession', () => {
    it('should successfully create a checkout session for a published paid course', async () => {
      courseRepository.findOne.mockResolvedValue(mockCourse);
      enrollmentRepository.findOne.mockResolvedValue(null);
      paymentRepository.findOne.mockResolvedValue(null);

      const result = await service.createCheckoutSession(
        'student-uuid-1',
        'student@example.com',
        'course-paid-1',
      );

      expect(result).toBeDefined();
      expect(result.checkoutSessionId).toBe('cs_test_session_123');
      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_session_123');
      expect(result.amount).toBe(49.99);
      expect(result.currency).toBe('USD');
      expect(result.status).toBe(PaymentStatus.PENDING);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: 'student@example.com',
          client_reference_id: 'student-uuid-1',
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 4999,
                currency: 'usd',
              }),
            }),
          ],
        }),
      );
    });

    it('should throw NotFoundException if course does not exist', async () => {
      courseRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession('student-1', 's@test.com', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if course is not published', async () => {
      courseRepository.findOne.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.DRAFT,
      });

      await expect(
        service.createCheckoutSession('student-1', 's@test.com', 'course-draft'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for free course (price = 0)', async () => {
      courseRepository.findOne.mockResolvedValue({
        ...mockCourse,
        price: 0,
      });

      await expect(
        service.createCheckoutSession('student-1', 's@test.com', 'course-free'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if student already has active enrollment', async () => {
      courseRepository.findOne.mockResolvedValue(mockCourse);
      enrollmentRepository.findOne.mockResolvedValue({
        ...mockEnrollment,
        status: EnrollmentStatus.ACTIVE,
      });

      await expect(
        service.createCheckoutSession('student-uuid-1', 's@test.com', 'course-paid-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if successful payment already exists', async () => {
      courseRepository.findOne.mockResolvedValue(mockCourse);
      enrollmentRepository.findOne.mockResolvedValue(null);
      paymentRepository.findOne.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCEEDED,
      });

      await expect(
        service.createCheckoutSession('student-uuid-1', 's@test.com', 'course-paid-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('handleWebhook', () => {
    it('should reject invalid webhook signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        service.handleWebhook('bad-sig', Buffer.from('payload')),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process checkout.session.completed and activate enrollment transactionally', async () => {
      const eventPayload = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_session_123',
            amount_total: 4999,
            currency: 'usd',
            payment_intent: 'pi_test_123',
            metadata: {
              paymentId: 'payment-uuid-1',
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(eventPayload);
      paymentRepository.findOne.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.PENDING,
      });

      const response = await service.handleWebhook('valid-sig', Buffer.from('payload'));
      expect(response.received).toBe(true);
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should handle duplicate webhook events idempotently without re-executing transitions', async () => {
      const eventPayload = {
        id: 'evt_duplicate_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_session_123',
            amount_total: 4999,
            currency: 'usd',
            payment_intent: 'pi_test_123',
            metadata: {
              paymentId: 'payment-uuid-1',
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(eventPayload);
      paymentRepository.findOne.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCEEDED, // Already succeeded
      });

      const response = await service.handleWebhook('valid-sig', Buffer.from('payload'));
      expect(response.received).toBe(true);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should reject webhook if amount does not match authoritative internal record', async () => {
      const eventPayload = {
        id: 'evt_tampered_amount',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_session_123',
            amount_total: 100, // Tampered: $1 instead of $49.99 (4999)
            currency: 'usd',
            payment_intent: 'pi_test_123',
            metadata: {
              paymentId: 'payment-uuid-1',
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(eventPayload);
      paymentRepository.findOne.mockResolvedValue({
        ...mockPayment,
        amount: 49.99,
        status: PaymentStatus.PENDING,
      });

      await expect(
        service.handleWebhook('valid-sig', Buffer.from('payload')),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transition payment to FAILED when payment_intent.payment_failed arrives', async () => {
      const eventPayload = {
        id: 'evt_fail_123',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_fail_123',
            metadata: { paymentId: 'payment-uuid-1' },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(eventPayload);
      const pendingPayment = { ...mockPayment, status: PaymentStatus.PENDING };
      paymentRepository.findOne.mockResolvedValue(pendingPayment);

      const response = await service.handleWebhook('valid-sig', Buffer.from('payload'));
      expect(response.received).toBe(true);
      expect(pendingPayment.status).toBe(PaymentStatus.FAILED);
      expect(paymentRepository.save).toHaveBeenCalled();
    });
  });

  describe('getPaymentById', () => {
    it('should allow student to view their own payment record', async () => {
      paymentRepository.findOne.mockResolvedValue(mockPayment);

      const result = await service.getPaymentById(
        'payment-uuid-1',
        'student-uuid-1',
        UserRole.STUDENT,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('payment-uuid-1');
    });

    it('should allow admin to view any student payment record', async () => {
      paymentRepository.findOne.mockResolvedValue(mockPayment);

      const result = await service.getPaymentById(
        'payment-uuid-1',
        'admin-uuid-999',
        UserRole.ADMIN,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('payment-uuid-1');
    });

    it('should reject non-owner student viewing another student payment', async () => {
      paymentRepository.findOne.mockResolvedValue(mockPayment);

      await expect(
        service.getPaymentById('payment-uuid-1', 'different-student-uuid', UserRole.STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent payment', async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getPaymentById('missing-payment', 'student-uuid-1', UserRole.STUDENT),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
