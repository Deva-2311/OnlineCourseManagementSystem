/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { Certificate } from './entities/certificate.entity';
import { CertificateStatus } from './enums/certificate-status.enum';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';
import { Course } from '../courses/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { QuizAttemptStatus } from '../quizzes/enums/quiz-attempt-status.enum';
import { ProgressService } from '../progress/progress.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email/email.service';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('CertificatesService', () => {
  let service: CertificatesService;

  const mockCertificateRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockEnrollmentRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockCourseRepo = {
    findOne: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockQuizRepo = {
    find: jest.fn(),
  };

  const mockQuizAttemptRepo = {
    find: jest.fn(),
  };

  const mockProgressService = {
    calculateCourseProgress: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  const mockCourse: any = {
    id: 'course-1',
    title: 'Computer Systems Architecture',
  };

  const mockStudent: any = {
    id: 'student-1',
    fullName: 'Alice Walker',
    email: 'alice@example.com',
  };

  const mockEnrollment: any = {
    id: 'enr-1',
    studentId: 'student-1',
    courseId: 'course-1',
    status: EnrollmentStatus.ACTIVE,
    course: mockCourse,
    student: mockStudent,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificatesService,
        {
          provide: getRepositoryToken(Certificate),
          useValue: mockCertificateRepo,
        },
        {
          provide: getRepositoryToken(Enrollment),
          useValue: mockEnrollmentRepo,
        },
        {
          provide: getRepositoryToken(Course),
          useValue: mockCourseRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(Quiz),
          useValue: mockQuizRepo,
        },
        {
          provide: getRepositoryToken(QuizAttempt),
          useValue: mockQuizAttemptRepo,
        },
        {
          provide: ProgressService,
          useValue: mockProgressService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
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

    service = module.get<CertificatesService>(CertificatesService);
  });

  describe('issueCertificate', () => {
    it('should issue a certificate when student has completed course and passed all quizzes', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue(mockEnrollment);
      mockCertificateRepo.findOne.mockResolvedValue(null); // No existing certificate

      mockProgressService.calculateCourseProgress.mockResolvedValue({
        totalLessons: 5,
        completedLessons: 5,
        completionPercentage: 100.0,
        isCompleted: true,
        lessons: [{ lessonId: 'l-1' }, { lessonId: 'l-2' }],
      });

      // 1 quiz attached, which the student passed
      mockQuizRepo.find.mockResolvedValue([
        {
          id: 'quiz-1',
          title: 'Architecture Checkpoint',
          attempts: [
            {
              studentId: 'student-1',
              status: QuizAttemptStatus.SUBMITTED,
              isPassed: true,
            },
          ],
        },
      ]);

      const createdCert: any = {
        id: 'cert-1',
        certificateNumber: 'OCMS-CERT-TEST-12345',
        studentId: 'student-1',
        courseId: 'course-1',
        enrollmentId: 'enr-1',
        status: CertificateStatus.ACTIVE,
        issuedAt: new Date(),
        course: mockCourse,
        student: mockStudent,
        toSafeCertificate: () => ({
          id: 'cert-1',
          certificateNumber: 'OCMS-CERT-TEST-12345',
          status: CertificateStatus.ACTIVE,
          courseTitle: 'Computer Systems Architecture',
          recipientName: 'Alice Walker',
        }),
      };

      mockDataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockReturnValue(createdCert),
          save: jest.fn().mockImplementation(async (entity) => entity),
        };
        return cb(manager);
      });

      const cert = await service.issueCertificate('student-1', 'enr-1');
      expect(cert.certificateNumber).toBe('OCMS-CERT-TEST-12345');
      expect(cert.status).toBe(CertificateStatus.ACTIVE);
      expect(cert.recipientName).toBe('Alice Walker');
    });

    it('should be idempotent: returns existing certificate on repeated request', async () => {
      const existingCert: any = {
        id: 'cert-1',
        certificateNumber: 'OCMS-CERT-EXISTING-99',
        studentId: 'student-1',
        courseId: 'course-1',
        enrollmentId: 'enr-1',
        status: CertificateStatus.ACTIVE,
        toSafeCertificate: () => ({
          id: 'cert-1',
          certificateNumber: 'OCMS-CERT-EXISTING-99',
          status: CertificateStatus.ACTIVE,
        }),
      };

      mockEnrollmentRepo.findOne.mockResolvedValue(mockEnrollment);
      mockCertificateRepo.findOne.mockResolvedValue(existingCert);

      const cert = await service.issueCertificate('student-1', 'enr-1');
      expect(cert.certificateNumber).toBe('OCMS-CERT-EXISTING-99');
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('should reject issuance if student does not own the enrollment', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue(mockEnrollment); // studentId is 'student-1'

      await expect(
        service.issueCertificate('another-student', 'enr-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject issuance if enrollment is unpaid (PENDING_PAYMENT)', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue({
        ...mockEnrollment,
        status: EnrollmentStatus.PENDING_PAYMENT,
      });

      await expect(
        service.issueCertificate('student-1', 'enr-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject issuance if course curriculum is incomplete', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue(mockEnrollment);
      mockCertificateRepo.findOne.mockResolvedValue(null);

      mockProgressService.calculateCourseProgress.mockResolvedValue({
        totalLessons: 4,
        completedLessons: 2,
        completionPercentage: 50.0,
        isCompleted: false,
      });

      await expect(
        service.issueCertificate('student-1', 'enr-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject issuance if course has empty curriculum (0 lessons)', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue(mockEnrollment);
      mockCertificateRepo.findOne.mockResolvedValue(null);

      mockProgressService.calculateCourseProgress.mockResolvedValue({
        totalLessons: 0,
        completedLessons: 0,
        completionPercentage: 0,
        isCompleted: false,
      });

      await expect(
        service.issueCertificate('student-1', 'enr-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject issuance if student has not passed required course quizzes', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue(mockEnrollment);
      mockCertificateRepo.findOne.mockResolvedValue(null);

      mockProgressService.calculateCourseProgress.mockResolvedValue({
        totalLessons: 2,
        completedLessons: 2,
        completionPercentage: 100.0,
        isCompleted: true,
        lessons: [{ lessonId: 'l-1' }],
      });

      // 1 quiz attached, which the student has NOT passed
      mockQuizRepo.find.mockResolvedValue([
        {
          id: 'quiz-1',
          title: 'Mandatory Final Assessment',
          attempts: [
            {
              studentId: 'student-1',
              status: QuizAttemptStatus.SUBMITTED,
              isPassed: false,
            },
          ],
        },
      ]);

      await expect(
        service.issueCertificate('student-1', 'enr-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('public verification', () => {
    it('should publicly verify active certificate without exposing private details', async () => {
      const mockCert: any = {
        certificateNumber: 'OCMS-CERT-VERIFY-123',
        status: CertificateStatus.ACTIVE,
        issuedAt: new Date('2026-05-01'),
        course: mockCourse,
        student: mockStudent,
        toPublicVerification: () => ({
          isValid: true,
          status: CertificateStatus.ACTIVE,
          certificateNumber: 'OCMS-CERT-VERIFY-123',
          courseTitle: 'Computer Systems Architecture',
          recipientName: 'Alice Walker',
          issuedAt: new Date('2026-05-01'),
          revokedAt: null,
          revocationReason: null,
        }),
      };

      mockCertificateRepo.findOne.mockResolvedValue(mockCert);

      const res = await service.verifyPublicCertificate('OCMS-CERT-VERIFY-123');
      expect(res.isValid).toBe(true);
      expect(res.courseTitle).toBe('Computer Systems Architecture');
      expect(res.recipientName).toBe('Alice Walker');
      expect((res as any).email).toBeUndefined();
      expect((res as any).studentId).toBeUndefined();
    });

    it('should throw NotFoundException for unknown certificate numbers', async () => {
      mockCertificateRepo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyPublicCertificate('UNKNOWN-CODE'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should report revoked certificates as invalid with reason', async () => {
      const mockCert: any = {
        certificateNumber: 'OCMS-CERT-REVOKED-123',
        status: CertificateStatus.REVOKED,
        revokedAt: new Date(),
        revocationReason: 'Academic violation',
        course: mockCourse,
        student: mockStudent,
        toPublicVerification: () => ({
          isValid: false,
          status: CertificateStatus.REVOKED,
          certificateNumber: 'OCMS-CERT-REVOKED-123',
          courseTitle: 'Computer Systems Architecture',
          recipientName: 'Alice Walker',
          issuedAt: new Date('2026-05-01'),
          revokedAt: new Date(),
          revocationReason: 'Academic violation',
        }),
      };

      mockCertificateRepo.findOne.mockResolvedValue(mockCert);

      const res = await service.verifyPublicCertificate('OCMS-CERT-REVOKED-123');
      expect(res.isValid).toBe(false);
      expect(res.status).toBe(CertificateStatus.REVOKED);
      expect(res.revocationReason).toBe('Academic violation');
    });
  });

  describe('pdf generation and downloads', () => {
    it('should generate and return a valid PDF buffer for authorized student', async () => {
      const mockCert: any = {
        id: 'cert-1',
        certificateNumber: 'OCMS-CERT-PDF-123',
        studentId: 'student-1',
        status: CertificateStatus.ACTIVE,
        issuedAt: new Date(),
        course: mockCourse,
        student: mockStudent,
      };

      mockCertificateRepo.findOne.mockResolvedValue(mockCert);

      const download = await service.downloadCertificatePdf(
        'student-1',
        UserRole.STUDENT,
        'cert-1',
      );

      expect(download.buffer).toBeInstanceOf(Buffer);
      expect(download.buffer.length).toBeGreaterThan(500); // Standard PDF header and bytes
      expect(download.filename).toBe('certificate-OCMS-CERT-PDF-123.pdf');
    });

    it('should prevent student from downloading another student’s certificate', async () => {
      const mockCert: any = {
        id: 'cert-1',
        studentId: 'student-1',
        status: CertificateStatus.ACTIVE,
      };

      mockCertificateRepo.findOne.mockResolvedValue(mockCert);

      await expect(
        service.downloadCertificatePdf('student-2', UserRole.STUDENT, 'cert-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject downloading a revoked certificate', async () => {
      const mockCert: any = {
        id: 'cert-1',
        studentId: 'student-1',
        status: CertificateStatus.REVOKED,
      };

      mockCertificateRepo.findOne.mockResolvedValue(mockCert);

      await expect(
        service.downloadCertificatePdf('student-1', UserRole.STUDENT, 'cert-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revocation by admin', () => {
    it('should mark certificate as revoked with timestamp and reason', async () => {
      const mockCert: any = {
        id: 'cert-1',
        certificateNumber: 'OCMS-CERT-REVOKE-99',
        status: CertificateStatus.ACTIVE,
        course: mockCourse,
        student: mockStudent,
        toSafeCertificate: () => ({
          id: 'cert-1',
          status: CertificateStatus.REVOKED,
          revocationReason: 'Plagiarism identified in final assessment',
        }),
      };

      mockCertificateRepo.findOne.mockResolvedValue(mockCert);
      mockCertificateRepo.save.mockImplementation(async (c) => c);

      const revoked = await service.revokeCertificate(
        'admin-1',
        'cert-1',
        'Plagiarism identified in final assessment',
      );

      expect(mockCert.status).toBe(CertificateStatus.REVOKED);
      expect(mockCert.revokedAt).toBeDefined();
      expect(revoked.status).toBe(CertificateStatus.REVOKED);
    });
  });
});
