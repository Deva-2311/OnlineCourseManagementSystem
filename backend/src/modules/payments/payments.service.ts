import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { Course } from '../courses/entities/course.entity';
import { CourseStatus } from '../courses/enums/course-status.enum';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { UserRole } from '../users/enums/user-role.enum';
import {
  CheckoutSessionResponseDto,
  SafePaymentDto,
} from './dto/payment-response.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email/email.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { paymentSucceededTemplate } from '../notifications/email/email.templates';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction, AuditResourceType } from '../audit-log/enums/audit-action.enum';

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  onModuleInit() {
    const secretKey =
      this.configService.get<string>('stripe.secretKey') ||
      process.env.STRIPE_SECRET_KEY ||
      'sk_test_placeholder_key';
    this.stripe = new Stripe(secretKey);
  }

  // Allow setting a mocked Stripe client for unit testing
  setStripeClient(stripeClient: any) {
    this.stripe = stripeClient;
  }

  // ==========================================
  // CHECKOUT SESSION CREATION
  // ==========================================

  async createCheckoutSession(
    studentId: string,
    studentEmail: string,
    courseId: string,
  ): Promise<CheckoutSessionResponseDto> {
    // 1. Validate course existence
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: { category: true },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID "${courseId}" not found`);
    }

    // 2. Validate course publication status
    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException(
        `Checkout is only permitted for published courses. Current course status: "${course.status}".`,
      );
    }

    // 3. Reject free courses
    const numericPrice = Number(course.price);
    if (numericPrice <= 0) {
      throw new BadRequestException(
        'This course is free. Please enroll directly using the free enrollment endpoint without payment.',
      );
    }

    // 4. Validate student enrollment and existing payments
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { studentId, courseId },
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === EnrollmentStatus.ACTIVE) {
        throw new ConflictException('You are already actively enrolled in this course.');
      }
      if (existingEnrollment.status === EnrollmentStatus.COMPLETED) {
        throw new ConflictException('You have already completed this course.');
      }
    }

    const existingCompletedPayment = await this.paymentRepository.findOne({
      where: { studentId, courseId, status: PaymentStatus.SUCCEEDED },
    });

    if (existingCompletedPayment) {
      throw new ConflictException(
        'A successful payment record already exists for this course. Access should be active.',
      );
    }

    // 5. Validate prerequisites
    await this.enrollmentsService.validatePrerequisites(studentId, course);

    // 6. Ensure enrollment record exists with PENDING_PAYMENT status
    let enrollment = existingEnrollment;
    if (!enrollment) {
      enrollment = this.enrollmentRepository.create({
        studentId,
        courseId,
        status: EnrollmentStatus.PENDING_PAYMENT,
        enrolledAt: null,
        completedAt: null,
      });
      enrollment = await this.enrollmentRepository.save(enrollment);
    }

    // 7. Initialize or reuse pending payment record
    let payment = await this.paymentRepository.findOne({
      where: {
        studentId,
        courseId,
        status: PaymentStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (!payment) {
      payment = this.paymentRepository.create({
        studentId,
        courseId,
        enrollmentId: enrollment.id,
        amount: course.price,
        currency: course.currency,
        status: PaymentStatus.PENDING,
      });
      payment = await this.paymentRepository.save(payment);
    }

    // 8. Create Stripe Checkout Session
    const unitAmount = Math.round(numericPrice * 100);
    const configuredSuccessUrl =
      this.configService.get<string>('stripe.successUrl') ||
      'http://localhost:3000/student/enrollments?payment=success&session_id={CHECKOUT_SESSION_ID}';
    const configuredCancelUrl =
      this.configService.get<string>('stripe.cancelUrl') ||
      'http://localhost:3000/courses/{COURSE_ID}?payment=cancelled';

    const successUrl = configuredSuccessUrl
      .replace('{COURSE_ID}', course.id);
    const cancelUrl = configuredCancelUrl
      .replace('{COURSE_ID}', course.id);

    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: studentEmail,
        client_reference_id: studentId,
        line_items: [
          {
            price_data: {
              currency: course.currency.toLowerCase(),
              product_data: {
                name: course.title,
                description: course.shortDescription || undefined,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          paymentId: payment.id,
          enrollmentId: enrollment.id,
          studentId,
          courseId: course.id,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      payment.stripeCheckoutSessionId = session.id;
      payment.amount = course.price;
      payment.currency = course.currency;
      await this.paymentRepository.save(payment);

      this.logger.log(
        `Created Stripe Checkout Session [${session.id}] for Payment [${payment.id}], Student [${studentId}], Course [${course.id}]`,
      );

      return {
        paymentId: payment.id,
        checkoutSessionId: session.id,
        checkoutUrl: session.url || '',
        amount: course.price,
        currency: course.currency,
        status: payment.status,
      };
    } catch (err: any) {
      this.logger.error(`Stripe checkout session creation failed: ${err.message}`, err.stack);
      throw new BadRequestException(`Failed to create checkout session: ${err.message}`);
    }
  }

  // ==========================================
  // STRIPE WEBHOOK PROCESSING
  // ==========================================

  async handleWebhook(
    signature: string,
    rawBody: Buffer,
  ): Promise<{ received: boolean; status?: string }> {
    const webhookSecret =
      this.configService.get<string>('stripe.webhookSecret') ||
      process.env.STRIPE_WEBHOOK_SECRET ||
      'whsec_placeholder_secret';

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Invalid Stripe webhook signature: ${err.message}`);
    }

    this.logger.log(`Processing Stripe webhook event: [${event.type}] (ID: ${event.id})`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.processCheckoutSessionCompleted(session);
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.processPaymentIntentSucceeded(paymentIntent);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.processPaymentIntentFailed(paymentIntent);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.processCheckoutSessionExpired(session);
        break;
      }
      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
    }

    return { received: true };
  }

  // ==========================================
  // EVENT PROCESSORS (TRANSACTIONAL & IDEMPOTENT)
  // ==========================================

  async processCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const sessionId = session.id;
    const paymentId = session.metadata?.paymentId;

    let payment = await this.paymentRepository.findOne({
      where: [
        { stripeCheckoutSessionId: sessionId },
        ...(paymentId ? [{ id: paymentId }] : []),
      ],
      relations: { enrollment: true },
    });

    if (!payment) {
      this.logger.warn(
        `Webhook warning: No payment found for session [${sessionId}] or paymentId [${paymentId}]`,
      );
      return;
    }

    // Idempotency check: don't re-process already succeeded payments
    if (payment.status === PaymentStatus.SUCCEEDED) {
      this.logger.log(`Payment [${payment.id}] is already SUCCEEDED. Idempotently ignoring event.`);
      return;
    }

    // Authoritative amount validation
    if (session.amount_total !== null && session.amount_total !== undefined) {
      const expectedCents = Math.round(Number(payment.amount) * 100);
      if (session.amount_total !== expectedCents) {
        this.logger.error(
          `Payment amount mismatch for payment [${payment.id}]: expected ${expectedCents}, got ${session.amount_total}`,
        );
        throw new BadRequestException('Payment amount mismatch between Stripe and internal record');
      }
    }

    // Currency validation
    if (session.currency && session.currency.toLowerCase() !== payment.currency.toLowerCase()) {
      this.logger.error(
        `Payment currency mismatch for payment [${payment.id}]: expected ${payment.currency}, got ${session.currency}`,
      );
      throw new BadRequestException('Payment currency mismatch between Stripe and internal record');
    }

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || payment.stripePaymentIntentId;

    // Transactional state transition: Payment -> SUCCEEDED, Enrollment -> ACTIVE
    await this.dataSource.transaction(async (manager) => {
      payment.status = PaymentStatus.SUCCEEDED;
      payment.stripeCheckoutSessionId = sessionId;
      payment.stripePaymentIntentId = paymentIntentId;
      payment.paidAt = new Date();
      await manager.save(payment);

      if (payment.enrollmentId) {
        await manager.update(
          Enrollment,
          { id: payment.enrollmentId },
          {
            status: EnrollmentStatus.ACTIVE,
            enrolledAt: new Date(),
          },
        );
      } else if (payment.studentId && payment.courseId) {
        await manager.update(
          Enrollment,
          { studentId: payment.studentId, courseId: payment.courseId },
          {
            status: EnrollmentStatus.ACTIVE,
            enrolledAt: new Date(),
          },
        );
      }
    });

    this.logger.log(
      `Successfully verified payment [${payment.id}] and activated enrollment for student [${payment.studentId}], course [${payment.courseId}]`,
    );

    // Fire in-app notification and email (non-blocking)
    if (payment.studentId) {
      void this.notificationsService.createNotification({
        userId: payment.studentId,
        type: NotificationType.PAYMENT_SUCCEEDED,
        title: `Payment confirmed`,
        message: `Your payment has been confirmed and your enrollment is now active.`,
        actionUrl: `/student/enrollments`,
        metadata: { paymentId: payment.id, courseId: payment.courseId },
      });

      // Attempt to load student email for email notification
      try {
        const enrollment = await this.enrollmentRepository.findOne({
          where: { id: payment.enrollmentId || undefined },
          relations: { student: true, course: true },
        });
        if (enrollment?.student?.email && enrollment?.course?.title) {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          const course = enrollment.course;
          const tpl = paymentSucceededTemplate({
            fullName: enrollment.student.fullName,
            courseTitle: course.title,
            amount: payment.amount,
            currency: payment.currency,
            courseUrl: `${frontendUrl}/student/courses/${course.slug || course.id}`,
          });
          void this.emailService.sendMail({ to: enrollment.student.email, ...tpl });
        }
      } catch (emailErr: any) {
        this.logger.warn(`Could not send payment confirmation email: ${emailErr.message}`);
      }

      // Audit log (non-blocking)
      void this.auditLogService.log({
        actorId: payment.studentId,
        action: AuditAction.PAYMENT_SUCCEEDED,
        resourceType: AuditResourceType.PAYMENT,
        resourceId: payment.id,
        metadata: { courseId: payment.courseId, amount: payment.amount, currency: payment.currency },
      });
    }
  }

  async processPaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: [
        { stripePaymentIntentId: paymentIntent.id },
        ...(paymentIntent.metadata?.paymentId ? [{ id: paymentIntent.metadata.paymentId }] : []),
      ],
    });

    if (!payment) {
      return;
    }

    if (payment.status === PaymentStatus.SUCCEEDED) {
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      payment.status = PaymentStatus.SUCCEEDED;
      payment.stripePaymentIntentId = paymentIntent.id;
      payment.paidAt = new Date();
      await manager.save(payment);

      if (payment.enrollmentId) {
        await manager.update(
          Enrollment,
          { id: payment.enrollmentId },
          {
            status: EnrollmentStatus.ACTIVE,
            enrolledAt: new Date(),
          },
        );
      }
    });

    this.logger.log(`PaymentIntent [${paymentIntent.id}] transitioned payment [${payment.id}] to SUCCEEDED`);
  }

  async processPaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: [
        { stripePaymentIntentId: paymentIntent.id },
        ...(paymentIntent.metadata?.paymentId ? [{ id: paymentIntent.metadata.paymentId }] : []),
      ],
    });

    if (payment && payment.status === PaymentStatus.PENDING) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepository.save(payment);
      this.logger.warn(`Payment [${payment.id}] transitioned to FAILED`);
    }
  }

  async processCheckoutSessionExpired(session: Stripe.Checkout.Session): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: [
        { stripeCheckoutSessionId: session.id },
        ...(session.metadata?.paymentId ? [{ id: session.metadata.paymentId }] : []),
      ],
    });

    if (payment && payment.status === PaymentStatus.PENDING) {
      payment.status = PaymentStatus.CANCELLED;
      await this.paymentRepository.save(payment);
      this.logger.log(`Payment [${payment.id}] session expired and transitioned to CANCELLED`);
    }
  }

  // ==========================================
  // PAYMENT STATUS & RECONCILIATION
  // ==========================================

  async getPaymentById(
    paymentId: string,
    currentUserId: string,
    role: UserRole,
  ): Promise<SafePaymentDto> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: { course: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID "${paymentId}" not found`);
    }

    // Role-based visibility: only ADMIN or student owner can view
    if (role !== UserRole.ADMIN && payment.studentId !== currentUserId) {
      throw new ForbiddenException(
        'Access denied: You do not have permission to view this payment record',
      );
    }

    return payment.toSafePayment();
  }

  async reconcilePaymentSession(
    paymentId: string,
    currentUserId: string,
  ): Promise<SafePaymentDto> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: { course: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID "${paymentId}" not found`);
    }

    if (payment.studentId !== currentUserId) {
      throw new ForbiddenException('Access denied: You do not own this payment record');
    }

    if (payment.status === PaymentStatus.SUCCEEDED) {
      return payment.toSafePayment();
    }

    if (payment.stripeCheckoutSessionId) {
      try {
        const session = await this.stripe.checkout.sessions.retrieve(
          payment.stripeCheckoutSessionId,
        );
        if (session.payment_status === 'paid') {
          await this.processCheckoutSessionCompleted(session);
          const updated = await this.paymentRepository.findOne({
            where: { id: paymentId },
            relations: { course: true },
          });
          return (updated || payment).toSafePayment();
        }
      } catch (err: any) {
        this.logger.warn(`Session reconciliation check failed: ${err.message}`);
      }
    }

    return payment.toSafePayment();
  }

  async reconcileSessionBySessionId(
    sessionId: string,
    currentUserId: string,
  ): Promise<SafePaymentDto> {
    const payment = await this.paymentRepository.findOne({
      where: { stripeCheckoutSessionId: sessionId },
      relations: { course: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record for session "${sessionId}" not found`);
    }

    if (payment.studentId !== currentUserId) {
      throw new ForbiddenException('Access denied: You do not own this payment record');
    }

    if (payment.status === PaymentStatus.SUCCEEDED) {
      return payment.toSafePayment();
    }

    if (this.stripe) {
      try {
        const session = await this.stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid') {
          await this.processCheckoutSessionCompleted(session);
          const updated = await this.paymentRepository.findOne({
            where: { id: payment.id },
            relations: { course: true },
          });
          return (updated || payment).toSafePayment();
        }
      } catch (err: any) {
        this.logger.warn(`Session reconciliation check failed: ${err.message}`);
      }
    }

    return payment.toSafePayment();
  }
}
