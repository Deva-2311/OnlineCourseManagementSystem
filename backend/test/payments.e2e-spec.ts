/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { PaymentStatus } from '../src/modules/payments/enums/payment-status.enum';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { EnrollmentStatus } from '../src/modules/enrollments/enums/enrollment-status.enum';

describe('Payment Processing with Stripe (e2e)', () => {
  let app: INestApplication;
  let paymentsService: PaymentsService;

  let adminToken: string;
  let instructorToken: string;
  let student1Token: string;
  let student2Token: string;

  let categoryId: string;
  let freeCourseId: string;
  let paidCourseId: string;
  let draftCourseId: string;
  let prereqCourseId: string;
  let advancedCourseId: string;

  let createdPaymentId: string;
  let createdSessionId: string;

  let mockStripe: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('/api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    paymentsService = app.get<PaymentsService>(PaymentsService);

    // Mock Stripe SDK
    mockStripe = {
      checkout: {
        sessions: {
          create: jest.fn().mockImplementation(async (params) => {
            const sid = `cs_test_${Date.now()}`;
            return {
              id: sid,
              url: `https://checkout.stripe.com/pay/${sid}`,
              amount_total: params.line_items[0].price_data.unit_amount,
              currency: params.line_items[0].price_data.currency,
              metadata: params.metadata,
            };
          }),
          retrieve: jest.fn().mockImplementation(async (sid) => ({
            id: sid,
            payment_status: 'paid',
            amount_total: 9999,
            currency: 'usd',
            payment_intent: 'pi_test_reconciled',
            metadata: {
              paymentId: createdPaymentId,
            },
          })),
        },
      },
      webhooks: {
        constructEvent: jest.fn().mockImplementation((rawBody, signature, secret) => {
          if (signature === 'invalid_signature') {
            throw new Error('Invalid signature');
          }
          return JSON.parse(rawBody.toString());
        }),
      },
    };
    paymentsService.setStripeClient(mockStripe);

    // 1. Authenticate Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@ocms.com', password: 'AdminSecurePass123!' });
    adminToken = adminLogin.body.accessToken;

    // 2. Register & Login Instructor
    const instEmail = `inst_pay_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Payment Instructor',
      email: instEmail,
      password: 'StrongPass123!',
      role: UserRole.INSTRUCTOR,
    });
    const instLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: instEmail, password: 'StrongPass123!' });
    instructorToken = instLogin.body.accessToken;

    // 3. Register & Login Student 1
    const s1Email = `student1_pay_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Payment Student 1',
      email: s1Email,
      password: 'StrongPass123!',
      role: UserRole.STUDENT,
    });
    const s1Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: s1Email, password: 'StrongPass123!' });
    student1Token = s1Login.body.accessToken;

    // 4. Register & Login Student 2
    const s2Email = `student2_pay_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Payment Student 2',
      email: s2Email,
      password: 'StrongPass123!',
      role: UserRole.STUDENT,
    });
    const s2Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: s2Email, password: 'StrongPass123!' });
    student2Token = s2Login.body.accessToken;

    // 5. Create Category
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Payment Cat ${Date.now()}` });
    categoryId = catRes.body.id;

    // 6. Create Free Course
    const freeRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Free Web Basics Course',
        description: 'Free HTML & CSS essentials for beginners',
        categoryId,
        price: 0,
        learningOutcomes: ['Basic HTML', 'CSS Styles'],
      });
    freeCourseId = freeRes.body.id;
    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${freeCourseId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${freeCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    // 7. Create Paid Course
    const paidRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Fullstack Microservices Mastery',
        description: 'Complete paid masterclass on scalable microservices',
        categoryId,
        price: 99.99,
        currency: 'USD',
        learningOutcomes: ['Microservices', 'Event Bus'],
      });
    paidCourseId = paidRes.body.id;
    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${paidCourseId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${paidCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    // 8. Create Draft Course
    const draftRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Unpublished Paid Course in Draft',
        description: 'Draft course not ready for public checkout',
        categoryId,
        price: 49.99,
      });
    draftCourseId = draftRes.body.id;

    // 9. Create Prerequisite Course and Dependent Paid Course
    const prereqRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Algorithms Foundation Course',
        description: 'Mandatory prerequisites for advanced algorithms',
        categoryId,
        price: 0,
        learningOutcomes: ['Big-O Notation', 'Sorting Algorithms'],
      });
    prereqCourseId = prereqRes.body.id;
    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${prereqCourseId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${prereqCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const advRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Competitive Programming Paid Bootcamp',
        description: 'Requires Algorithms Foundation Course to enroll in this bootcamp',
        categoryId,
        price: 79.99,
        prerequisites: ['Algorithms Foundation Course'],
        learningOutcomes: ['Graph Theory', 'Dynamic Programming'],
      });
    advancedCourseId = advRes.body.id;
    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${advancedCourseId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${advancedCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // 1. AUTHENTICATION & ROLE ACCESS
  // ==========================================

  describe('Authentication & Role Restrictions', () => {
    it('should reject unauthenticated checkout session creation with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/checkout-session')
        .send({ courseId: paidCourseId });

      expect(res.status).toBe(401);
    });

    it('should reject non-student checkout attempts (Instructor -> 403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/checkout-session')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ courseId: paidCourseId });

      expect(res.status).toBe(403);
    });

    it('should reject non-student checkout attempts (Admin -> 403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/checkout-session')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ courseId: paidCourseId });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 2. COURSE ELIGIBILITY & VALIDATION
  // ==========================================

  describe('Course Validation & Pricing Integrity', () => {
    it('should return 404 when initiating checkout for a nonexistent course', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/checkout-session')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ courseId: 'a123e456-e89b-42d3-a456-426614174000' });

      expect(res.status).toBe(404);
    });

    it('should reject checkout for a draft / unpublished course with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/checkout-session')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ courseId: draftCourseId });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('published courses');
    });

    it('should reject checkout for a free course with 400 directing to free enrollment endpoint', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/checkout-session')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ courseId: freeCourseId });

      expect(res.status).toBe(400);
      expect(res.body.message.toLowerCase()).toContain('free');
    });

    it('should prevent checkout when student has unmet prerequisites', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/checkout-session')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ courseId: advancedCourseId });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Prerequisite requirement not satisfied');
    });
  });

  // ==========================================
  // 3. CHECKOUT SESSION CREATION & ACCESS STATE
  // ==========================================

  describe('Successful Checkout Initiation', () => {
    it('should create a checkout session and associate internal payment & enrollment', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/checkout-session')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ courseId: paidCourseId });

      expect(res.status).toBe(200);
      expect(res.body.paymentId).toBeDefined();
      expect(res.body.checkoutSessionId).toBeDefined();
      expect(res.body.checkoutUrl).toContain('checkout.stripe.com');
      expect(res.body.amount).toBe(99.99);
      expect(res.body.currency).toBe('USD');
      expect(res.body.status).toBe(PaymentStatus.PENDING);

      createdPaymentId = res.body.paymentId;
      createdSessionId = res.body.checkoutSessionId;
    });

    it('should verify enrollment is PENDING_PAYMENT and access is NOT granted prior to payment verification', async () => {
      const statusRes = await request(app.getHttpServer())
        .get(`/api/v1/courses/${paidCourseId}/enrollment-status`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.isEnrolled).toBe(false);
      expect(statusRes.body.status).toBe(EnrollmentStatus.PENDING_PAYMENT);
      expect(statusRes.body.enrolledAt).toBeNull();
    });
  });

  // ==========================================
  // 4. STRIPE WEBHOOK VERIFICATION & ACTIVATION
  // ==========================================

  describe('Stripe Webhook Processing & Idempotency', () => {
    it('should reject webhook requests with missing or invalid signature', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send({ id: 'evt_bad' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid Stripe webhook signature');
    });

    it('should reject webhook with missing signature header', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook')
        .send({ id: 'evt_no_sig' });

      expect(res.status).toBe(400);
    });

    it('should process verified checkout.session.completed webhook and activate enrollment', async () => {
      const webhookPayload = {
        id: 'evt_checkout_success',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: createdSessionId,
            amount_total: 9999, // $99.99 in cents
            currency: 'usd',
            payment_intent: 'pi_verified_intent_123',
            metadata: {
              paymentId: createdPaymentId,
            },
          },
        },
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook')
        .set('stripe-signature', 'valid_test_signature')
        .send(webhookPayload);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      // Verify payment transitioned to SUCCEEDED
      const paymentRes = await request(app.getHttpServer())
        .get(`/api/v1/payments/${createdPaymentId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(paymentRes.status).toBe(200);
      expect(paymentRes.body.status).toBe(PaymentStatus.SUCCEEDED);
      expect(paymentRes.body.paidAt).toBeDefined();

      // Verify enrollment is now ACTIVE
      const enrollmentRes = await request(app.getHttpServer())
        .get(`/api/v1/courses/${paidCourseId}/enrollment-status`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(enrollmentRes.status).toBe(200);
      expect(enrollmentRes.body.isEnrolled).toBe(true);
      expect(enrollmentRes.body.status).toBe(EnrollmentStatus.ACTIVE);
      expect(enrollmentRes.body.enrolledAt).toBeDefined();
    });

    it('should process duplicate webhook events idempotently without error', async () => {
      const duplicatePayload = {
        id: 'evt_duplicate_call',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: createdSessionId,
            amount_total: 9999,
            currency: 'usd',
            payment_intent: 'pi_verified_intent_123',
            metadata: {
              paymentId: createdPaymentId,
            },
          },
        },
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook')
        .set('stripe-signature', 'valid_test_signature')
        .send(duplicatePayload);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });

    it('should reject checkout session creation if student already completed payment (409 Conflict)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/checkout-session')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ courseId: paidCourseId });

      expect(res.status).toBe(409);
    });
  });

  // ==========================================
  // 5. PAYMENT STATUS VISIBILITY & RBAC
  // ==========================================

  describe('Payment Visibility & Access Control', () => {
    it('should allow student 1 to view their own payment details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/${createdPaymentId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdPaymentId);
      expect(res.body.amount).toBe(99.99);
      expect(res.body.currency).toBe('USD');
      expect(res.body.status).toBe(PaymentStatus.SUCCEEDED);
      expect(res.body.course).toBeDefined();
      expect(res.body.course.id).toBe(paidCourseId);
    });

    it('should reject student 2 viewing student 1 payment (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/${createdPaymentId}`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('should allow Admin to view student 1 payment details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/${createdPaymentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdPaymentId);
      expect(res.body.amount).toBe(99.99);
    });
  });

  // ==========================================
  // 6. FREE ENROLLMENT REGRESSION CHECK
  // ==========================================

  describe('Free Course Enrollment Flow Regression', () => {
    it('should successfully enroll student 2 directly in free course without payment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/courses/${freeCourseId}/enroll`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.requiresPayment).toBe(false);
      expect(res.body.enrollment.status).toBe(EnrollmentStatus.ACTIVE);
      expect(res.body.enrollment.enrolledAt).toBeDefined();

      const statusRes = await request(app.getHttpServer())
        .get(`/api/v1/courses/${freeCourseId}/enrollment-status`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(statusRes.body.isEnrolled).toBe(true);
      expect(statusRes.body.status).toBe(EnrollmentStatus.ACTIVE);
    });
  });
});
