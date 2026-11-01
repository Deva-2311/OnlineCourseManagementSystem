/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { Enrollment } from './entities/enrollment.entity';
import { EnrollmentStatus } from './enums/enrollment-status.enum';
import { Course } from '../courses/entities/course.entity';
import { CourseStatus } from '../courses/enums/course-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email/email.service';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let enrollmentRepo: any;
  let courseRepo: any;

  const studentId = 'student-uuid-1';
  const otherStudentId = 'student-uuid-2';
  const courseId = 'course-uuid-1';
  const instructorId = 'instructor-uuid-1';

  const mockFreePublishedCourse: Course = {
    id: courseId,
    title: 'Introduction to Computer Science',
    slug: 'intro-to-cs',
    description: 'Learn fundamentals of CS for free.',
    price: 0.0,
    currency: 'USD',
    status: CourseStatus.PUBLISHED,
    instructorId,
    categoryId: 'cat-1',
    prerequisites: [],
    learningOutcomes: ['Basic coding'],
    createdAt: new Date(),
    updatedAt: new Date(),
    toPublicCourse: jest.fn(),
  } as any;

  const mockPaidPublishedCourse: Course = {
    ...mockFreePublishedCourse,
    id: 'course-paid-1',
    title: 'Advanced System Design',
    price: 89.99,
    toPublicCourse: jest.fn(),
  } as any;

  const mockActiveEnrollment: Enrollment = {
    id: 'enrollment-uuid-1',
    studentId,
    courseId,
    status: EnrollmentStatus.ACTIVE,
    enrolledAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    toSafeEnrollment() {
      return {
        id: this.id,
        studentId: this.studentId,
        courseId: this.courseId,
        status: this.status,
        enrolledAt: this.enrolledAt,
        completedAt: this.completedAt,
        createdAt: this.createdAt,
      } as any;
    },
  } as any;

  beforeEach(async () => {
    enrollmentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    courseRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        {
          provide: getRepositoryToken(Enrollment),
          useValue: enrollmentRepo,
        },
        {
          provide: getRepositoryToken(Course),
          useValue: courseRepo,
        },
        {
          provide: NotificationsService,
          useValue: { createNotification: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: EmailService,
          useValue: { sendMail: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<EnrollmentsService>(EnrollmentsService);
  });

  describe('enroll in free course', () => {
    it('should successfully enroll student with ACTIVE status in a free published course', async () => {
      courseRepo.findOne.mockResolvedValue(mockFreePublishedCourse);
      enrollmentRepo.findOne.mockResolvedValue(null); // No existing enrollment
      enrollmentRepo.create.mockImplementation((data: any) => ({
        ...mockActiveEnrollment,
        ...data,
      }));
      enrollmentRepo.save.mockImplementation(async (e: any) => e);

      const result = await service.enroll(studentId, courseId);

      expect(result.requiresPayment).toBe(false);
      expect(result.enrollment.status).toBe(EnrollmentStatus.ACTIVE);
      expect(result.enrollment.enrolledAt).toBeDefined();
      expect(result.message).toContain('Successfully enrolled');
    });

    it('should throw NotFoundException if course does not exist', async () => {
      courseRepo.findOne.mockResolvedValue(null);

      await expect(service.enroll(studentId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if course is not PUBLISHED (e.g. DRAFT)', async () => {
      courseRepo.findOne.mockResolvedValue({
        ...mockFreePublishedCourse,
        status: CourseStatus.DRAFT,
      });

      await expect(service.enroll(studentId, courseId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if student is already actively enrolled', async () => {
      courseRepo.findOne.mockResolvedValue(mockFreePublishedCourse);
      enrollmentRepo.findOne.mockResolvedValue(mockActiveEnrollment);

      await expect(service.enroll(studentId, courseId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('enroll in paid course', () => {
    it('should create PENDING_PAYMENT enrollment without granting immediate active access', async () => {
      courseRepo.findOne.mockResolvedValue(mockPaidPublishedCourse);
      enrollmentRepo.findOne.mockResolvedValue(null);
      enrollmentRepo.create.mockImplementation((data: any) => ({
        id: 'enrollment-pending-1',
        studentId,
        courseId: mockPaidPublishedCourse.id,
        status: EnrollmentStatus.PENDING_PAYMENT,
        enrolledAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        toSafeEnrollment() {
          return {
            id: this.id,
            studentId: this.studentId,
            courseId: this.courseId,
            status: this.status,
            enrolledAt: this.enrolledAt,
            createdAt: this.createdAt,
          } as any;
        },
      }));
      enrollmentRepo.save.mockImplementation(async (e: any) => e);

      const result = await service.enroll(studentId, mockPaidPublishedCourse.id);

      expect(result.requiresPayment).toBe(true);
      expect(result.amount).toBe(89.99);
      expect(result.enrollment.status).toBe(EnrollmentStatus.PENDING_PAYMENT);
      expect(result.enrollment.enrolledAt).toBeNull();
      expect(result.message).toContain('Payment authorization is required');
    });
  });

  describe('prerequisite validation', () => {
    it('should reject enrollment with BadRequestException if prerequisite course is not completed', async () => {
      const courseWithPrereq = {
        ...mockFreePublishedCourse,
        prerequisites: ['Foundational Programming'],
      };
      courseRepo.findOne.mockResolvedValue(courseWithPrereq);
      enrollmentRepo.findOne.mockResolvedValue(null);
      enrollmentRepo.find.mockResolvedValue([]); // Student has 0 completed courses

      courseRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'foundational-course-id',
          title: 'Foundational Programming',
        }),
      });

      await expect(service.enroll(studentId, courseId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findEnrollmentById & access control', () => {
    it('should allow student to view their own enrollment', async () => {
      enrollmentRepo.findOne.mockResolvedValue(mockActiveEnrollment);

      const result = await service.findEnrollmentById(
        studentId,
        UserRole.STUDENT,
        mockActiveEnrollment.id,
      );

      expect(result.id).toBe(mockActiveEnrollment.id);
    });

    it('should reject other students viewing enrollment with ForbiddenException', async () => {
      enrollmentRepo.findOne.mockResolvedValue(mockActiveEnrollment);

      await expect(
        service.findEnrollmentById(
          otherStudentId,
          UserRole.STUDENT,
          mockActiveEnrollment.id,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to view any enrollment', async () => {
      enrollmentRepo.findOne.mockResolvedValue(mockActiveEnrollment);

      const result = await service.findEnrollmentById(
        'admin-uuid',
        UserRole.ADMIN,
        mockActiveEnrollment.id,
      );

      expect(result.id).toBe(mockActiveEnrollment.id);
    });
  });

  describe('hasAccessToCourse', () => {
    it('should return true for ACTIVE enrollment', async () => {
      enrollmentRepo.findOne.mockResolvedValue(mockActiveEnrollment);
      const hasAccess = await service.hasAccessToCourse(studentId, courseId);
      expect(hasAccess).toBe(true);
    });

    it('should return false for PENDING_PAYMENT enrollment', async () => {
      enrollmentRepo.findOne.mockResolvedValue({
        ...mockActiveEnrollment,
        status: EnrollmentStatus.PENDING_PAYMENT,
      });
      const hasAccess = await service.hasAccessToCourse(studentId, courseId);
      expect(hasAccess).toBe(false);
    });

    it('should return false when no enrollment exists', async () => {
      enrollmentRepo.findOne.mockResolvedValue(null);
      const hasAccess = await service.hasAccessToCourse(studentId, courseId);
      expect(hasAccess).toBe(false);
    });
  });

  describe('instructor enrollment visibility', () => {
    it('should return enrollments for course owned by instructor', async () => {
      courseRepo.findOne.mockResolvedValue({
        id: courseId,
        instructorId,
      });
      enrollmentRepo.find.mockResolvedValue([mockActiveEnrollment]);

      const result = await service.findCourseEnrollmentsForInstructor(
        instructorId,
        courseId,
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });

    it('should reject instructor viewing enrollments for courses they do not own', async () => {
      courseRepo.findOne.mockResolvedValue({
        id: courseId,
        instructorId: 'another-instructor',
      });

      await expect(
        service.findCourseEnrollmentsForInstructor(instructorId, courseId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
