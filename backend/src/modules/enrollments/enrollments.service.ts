import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { EnrollmentStatus } from './enums/enrollment-status.enum';
import { Course } from '../courses/entities/course.entity';
import { CourseStatus } from '../courses/enums/course-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import {
  EnrollmentActionResponseDto,
  SafeEnrollmentDto,
} from './dto/enrollment-response.dto';
import { EnrollmentStatusDto } from './dto/enrollment-status.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email/email.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { enrollmentConfirmedTemplate } from '../notifications/email/email.templates';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction, AuditResourceType } from '../audit-log/enums/audit-action.enum';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ==========================================
  // STUDENT ENROLLMENT OPERATIONS
  // ==========================================

  async enroll(
    studentId: string,
    courseId: string,
    studentFullName = 'Student',
    studentEmail?: string,
  ): Promise<EnrollmentActionResponseDto> {
    // 1. Verify course existence
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
        `Enrollment is only permitted for published courses. Current course status: "${course.status}".`,
      );
    }

    // 3. Prevent duplicate enrollment
    const existing = await this.enrollmentRepository.findOne({
      where: { studentId, courseId },
      relations: { course: true },
    });

    if (existing) {
      if (existing.status === EnrollmentStatus.ACTIVE) {
        throw new ConflictException('You are already actively enrolled in this course.');
      }
      if (existing.status === EnrollmentStatus.COMPLETED) {
        throw new ConflictException('You have already completed this course.');
      }
      if (existing.status === EnrollmentStatus.PENDING_PAYMENT) {
        return {
          enrollment: existing.toSafeEnrollment(),
          requiresPayment: true,
          amount: course.price,
          currency: course.currency,
          message:
            'You already have an enrollment pending payment for this course. Please proceed to payment checkout.',
        };
      }
    }

    // 4. Validate prerequisites against student's existing active or completed enrollments
    await this.validatePrerequisites(studentId, course);

    // 5. Determine status and create enrollment record
    const isFree = Number(course.price) === 0;

    const newEnrollment = this.enrollmentRepository.create({
      studentId,
      courseId,
      status: isFree ? EnrollmentStatus.ACTIVE : EnrollmentStatus.PENDING_PAYMENT,
      enrolledAt: isFree ? new Date() : null,
      completedAt: null,
    });

    try {
      const saved = await this.enrollmentRepository.save(newEnrollment);
      saved.course = course;

      this.logger.log(
        `Enrollment created: [${saved.id}] for student [${studentId}] in course [${courseId}] (Status: ${saved.status})`,
      );

      if (isFree) {
        // Fire in-app notification (non-blocking)
        void this.notificationsService.createNotification({
          userId: studentId,
          type: NotificationType.ENROLLMENT_CONFIRMED,
          title: `Enrolled: ${course.title}`,
          message: `You are now enrolled in "${course.title}". Start learning at your own pace!`,
          actionUrl: `/student/courses/${course.slug || course.id}`,
          metadata: { courseId: course.id, enrollmentId: saved.id },
        });

        // Fire email (non-blocking — failures are swallowed inside EmailService)
        if (studentEmail) {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          const tpl = enrollmentConfirmedTemplate({
            fullName: studentFullName,
            courseTitle: course.title,
            courseUrl: `${frontendUrl}/student/courses/${course.slug || course.id}`,
          });
          void this.emailService.sendMail({ to: studentEmail, ...tpl });
        }

        // Audit log (non-blocking)
        void this.auditLogService.log({
          actorId: studentId,
          actorEmail: studentEmail,
          action: AuditAction.ENROLLMENT_CREATED,
          resourceType: AuditResourceType.ENROLLMENT,
          resourceId: saved.id,
          metadata: { courseId: course.id, courseTitle: course.title, isFree: true },
        });

        return {
          enrollment: saved.toSafeEnrollment(),
          requiresPayment: false,
          message: 'Successfully enrolled in free course.',
        };
      }

      return {
        enrollment: saved.toSafeEnrollment(),
        requiresPayment: true,
        amount: course.price,
        currency: course.currency,
        message:
          'Enrollment initiated. Payment authorization is required to activate course access.',
      };
    } catch (err: any) {
      // Handle concurrent race conditions caught by database unique constraint
      if (
        err.code === '23505' ||
        err.message?.includes('duplicate key') ||
        err.message?.includes('UQ_enrollment_student_course')
      ) {
        throw new ConflictException('You are already enrolled in this course.');
      }
      throw err;
    }
  }

  async findMyEnrollments(studentId: string): Promise<SafeEnrollmentDto[]> {
    const enrollments = await this.enrollmentRepository.find({
      where: { studentId },
      relations: { course: { category: true } },
      order: { createdAt: 'DESC' },
    });

    return enrollments.map((e) => e.toSafeEnrollment());
  }

  async findEnrollmentById(
    userId: string,
    role: UserRole,
    enrollmentId: string,
  ): Promise<SafeEnrollmentDto> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: { course: true, student: true },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment record with ID "${enrollmentId}" not found`);
    }

    // Enforce student ownership unless admin
    if (role !== UserRole.ADMIN && enrollment.studentId !== userId) {
      throw new ForbiddenException(
        'Access denied: You do not have permission to view this enrollment record',
      );
    }

    return enrollment.toSafeEnrollment();
  }

  async getEnrollmentStatus(
    studentId: string,
    courseId: string,
  ): Promise<EnrollmentStatusDto> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID "${courseId}" not found`);
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId, courseId },
    });

    return {
      isEnrolled: !!enrollment && enrollment.status === EnrollmentStatus.ACTIVE,
      status: enrollment ? enrollment.status : null,
      enrollmentId: enrollment ? enrollment.id : null,
      enrolledAt: enrollment ? enrollment.enrolledAt : null,
    };
  }

  // ==========================================
  // INSTRUCTOR & ADMIN VISIBILITY OPERATIONS
  // ==========================================

  async findCourseEnrollmentsForInstructor(
    instructorId: string,
    courseId: string,
  ) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID "${courseId}" not found`);
    }

    // Verify course ownership
    if (course.instructorId !== instructorId) {
      throw new ForbiddenException(
        'Access denied: You do not have permission to view enrollments for this course',
      );
    }

    const enrollments = await this.enrollmentRepository.find({
      where: { courseId },
      relations: { student: true },
      order: { createdAt: 'DESC' },
    });

    return enrollments.map((e) => ({
      id: e.id,
      status: e.status,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      student: {
        id: e.student?.id,
        name: e.student?.fullName,
        email: e.student?.email,
      },
    }));
  }

  async findAllAdminEnrollments(
    page = 1,
    limit = 10,
    status?: EnrollmentStatus,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const qb = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('enrollment.student', 'student');

    if (status) {
      qb.where('enrollment.status = :status', { status });
    }

    qb.orderBy('enrollment.createdAt', 'DESC').skip(skip).take(safeLimit);

    const [enrollments, total] = await qb.getManyAndCount();

    return {
      data: enrollments.map((e) => e.toSafeEnrollment()),
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  // ==========================================
  // REUSABLE ACCESS CONTROL CHECK
  // ==========================================

  async hasAccessToCourse(studentId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId, courseId },
    });

    if (!enrollment) {
      return false;
    }

    // Only ACTIVE or COMPLETED grant legitimate access
    return (
      enrollment.status === EnrollmentStatus.ACTIVE ||
      enrollment.status === EnrollmentStatus.COMPLETED
    );
  }

  // ==========================================
  // HELPERS
  // ==========================================

  async validatePrerequisites(studentId: string, course: Course): Promise<void> {
    if (!course.prerequisites || course.prerequisites.length === 0) {
      return;
    }

    // Fetch student's satisfied enrollments
    const studentEnrollments = await this.enrollmentRepository.find({
      where: { studentId },
      relations: { course: true },
    });

    const activeOrCompleted = studentEnrollments.filter(
      (e) =>
        e.status === EnrollmentStatus.ACTIVE ||
        e.status === EnrollmentStatus.COMPLETED,
    );

    const satisfiedIdentifiers = new Set<string>();
    activeOrCompleted.forEach((e) => {
      satisfiedIdentifiers.add(e.courseId.toLowerCase());
      if (e.course?.title) {
        satisfiedIdentifiers.add(e.course.title.toLowerCase().trim());
      }
      if (e.course?.slug) {
        satisfiedIdentifiers.add(e.course.slug.toLowerCase().trim());
      }
    });

    for (const prereq of course.prerequisites) {
      const normalizedPrereq = prereq.toLowerCase().trim();

      // Check if this prerequisite corresponds to an existing course in the database
      const prereqCourse = await this.courseRepository
        .createQueryBuilder('c')
        .where('LOWER(c.title) = :title OR LOWER(c.slug) = :slug OR c.id = :id', {
          title: normalizedPrereq,
          slug: normalizedPrereq,
          id: normalizedPrereq.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
            ? normalizedPrereq
            : '00000000-0000-0000-0000-000000000000',
        })
        .getOne();

      // If it refers to an actual course and the student has not completed/enrolled in it
      if (prereqCourse && !satisfiedIdentifiers.has(prereqCourse.id.toLowerCase())) {
        throw new BadRequestException(
          `Prerequisite requirement not satisfied: "${prereqCourse.title}". You must complete the prerequisite course before enrolling.`,
        );
      }
    }
  }
}
