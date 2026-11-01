import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
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
import {
  SafeCertificateDto,
  PublicCertificateVerificationDto,
} from './dto/certificate-response.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email/email.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { certificateIssuedTemplate } from '../notifications/email/email.templates';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction, AuditResourceType } from '../audit-log/enums/audit-action.enum';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(QuizAttempt)
    private readonly quizAttemptRepository: Repository<QuizAttempt>,
    private readonly progressService: ProgressService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private getBaseUrl(): string {
    return this.configService.get<string>('frontendUrl') || 'http://localhost:3000';
  }

  private generateCertificateNumber(): string {
    const timestampPart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `OCMS-CERT-${timestampPart}-${randomPart}`;
  }

  // ==========================================
  // CERTIFICATE ISSUANCE (STUDENT)
  // ==========================================

  async issueCertificate(
    studentId: string,
    enrollmentId: string,
  ): Promise<SafeCertificateDto> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: { course: true, student: true },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID "${enrollmentId}" not found`);
    }

    // 1. Enrollment ownership verification
    if (enrollment.studentId !== studentId) {
      throw new ForbiddenException(
        'Access denied: You can only request certificates for your own enrollments',
      );
    }

    // 2. Verified payment / course access verification
    if (
      enrollment.status !== EnrollmentStatus.ACTIVE &&
      enrollment.status !== EnrollmentStatus.COMPLETED
    ) {
      throw new ForbiddenException(
        'Access denied: Active enrollment with verified payment required for certificate issuance',
      );
    }

    // 3. Idempotency Check: If certificate already exists, return it
    const existingCert = await this.certificateRepository.findOne({
      where: { enrollmentId },
      relations: { course: true, student: true },
    });

    if (existingCert) {
      if (existingCert.status === CertificateStatus.ACTIVE) {
        return existingCert.toSafeCertificate(this.getBaseUrl());
      }
      if (existingCert.status === CertificateStatus.REVOKED) {
        throw new BadRequestException(
          'Certificate for this enrollment has been revoked. Reissuance requires administrative review.',
        );
      }
    }

    // 4. Curriculum Completion Verification (Reuse Phase 13 progress calculation engine)
    const progressSummary = await this.progressService.calculateCourseProgress(
      enrollment,
      enrollment.course,
      studentId,
    );

    if (progressSummary.totalLessons === 0) {
      throw new BadRequestException(
        'Cannot issue certificate: This course has no curriculum lessons.',
      );
    }

    if (!progressSummary.isCompleted) {
      throw new BadRequestException(
        `Cannot issue certificate: Course curriculum is incomplete (${progressSummary.completedLessons}/${progressSummary.totalLessons} lessons completed, ${progressSummary.completionPercentage}%). You must complete 100% of lessons first.`,
      );
    }

    // 5. Assessment / Quiz Passing Verification
    const lessonIds = progressSummary.lessons?.map((l) => l.lessonId) || [];
    if (lessonIds.length > 0) {
      const quizzes = await this.quizRepository.find({
        where: { lessonId: In(lessonIds), isPublished: true },
        relations: { attempts: true },
      });

      for (const quiz of quizzes) {
        const hasPassed = (quiz.attempts || []).some(
          (attempt) =>
            attempt.studentId === studentId &&
            attempt.status === QuizAttemptStatus.SUBMITTED &&
            attempt.isPassed,
        );

        if (!hasPassed) {
          throw new BadRequestException(
            `Cannot issue certificate: You must pass all required assessments in this course first. Incomplete assessment: "${quiz.title}".`,
          );
        }
      }
    }

    // 6. Safe Transactional Issuance
    return this.dataSource.transaction(async (manager) => {
      // Re-check for concurrent certificate creation inside transaction
      const inTxExisting = await manager.findOne(Certificate, {
        where: { enrollmentId },
        relations: { course: true, student: true },
      });

      if (inTxExisting) {
        return inTxExisting.toSafeCertificate(this.getBaseUrl());
      }

      const certificateNumber = this.generateCertificateNumber();
      const certificate = manager.create(Certificate, {
        certificateNumber,
        studentId,
        courseId: enrollment.courseId,
        enrollmentId,
        status: CertificateStatus.ACTIVE,
        issuedAt: new Date(),
        metadata: {
          totalLessons: progressSummary.totalLessons,
          completionPercentage: progressSummary.completionPercentage,
          courseTitle: enrollment.course.title,
        },
      });

      const saved = await manager.save(certificate);

      // Transition enrollment to COMPLETED if not already set
      if (enrollment.status !== EnrollmentStatus.COMPLETED) {
        enrollment.status = EnrollmentStatus.COMPLETED;
        enrollment.completedAt = enrollment.completedAt || new Date();
        await manager.save(enrollment);
      }

      saved.course = enrollment.course;
      saved.student = enrollment.student;

      this.logger.log(
        `Issued Certificate [${saved.certificateNumber}] to Student [${studentId}] for Course [${enrollment.courseId}]`,
      );

      const result = saved.toSafeCertificate(this.getBaseUrl());

      // Audit log (certificate issuance)
      void this.auditLogService.log({
        actorId: studentId,
        action: AuditAction.CERTIFICATE_ISSUED,
        resourceType: AuditResourceType.CERTIFICATE,
        resourceId: saved.id,
        metadata: {
          certificateNumber: saved.certificateNumber,
          courseId: enrollment.courseId,
          courseTitle: enrollment.course?.title,
        },
      });

      // Fire in-app notification + email (non-blocking)
      const frontendUrl = this.getBaseUrl();
      void this.notificationsService.createNotification({
        userId: studentId,
        type: NotificationType.CERTIFICATE_ISSUED,
        title: `Certificate issued: ${enrollment.course.title}`,
        message: `Congratulations! You have earned your certificate for "${enrollment.course.title}" (No. ${saved.certificateNumber}).`,
        actionUrl: `/student/certificates/${saved.id}`,
        metadata: { certificateId: saved.id, certificateNumber: saved.certificateNumber, courseId: enrollment.courseId },
      });
      if (enrollment.student?.email) {
        const tpl = certificateIssuedTemplate({
          fullName: enrollment.student.fullName,
          courseTitle: enrollment.course.title,
          certificateNumber: saved.certificateNumber,
          verifyUrl: `${frontendUrl}/certificates/verify/${saved.certificateNumber}`,
        });
        void this.emailService.sendMail({ to: enrollment.student.email, ...tpl });
      }

      return result;
    });
  }

  // ==========================================
  // CERTIFICATE QUERIES (STUDENT / PRIVATE)
  // ==========================================

  async getMyCertificates(studentId: string): Promise<SafeCertificateDto[]> {
    const certs = await this.certificateRepository.find({
      where: { studentId },
      relations: { course: true, student: true },
      order: { issuedAt: 'DESC' },
    });

    return certs.map((c) => c.toSafeCertificate(this.getBaseUrl()));
  }

  async getCertificateById(
    userId: string,
    userRole: UserRole,
    certificateId: string,
  ): Promise<SafeCertificateDto> {
    const cert = await this.certificateRepository.findOne({
      where: { id: certificateId },
      relations: { course: true, student: true },
    });

    if (!cert) {
      throw new NotFoundException(`Certificate with ID "${certificateId}" not found`);
    }

    // Students can only view their own certificates
    if (userRole === UserRole.STUDENT && cert.studentId !== userId) {
      throw new ForbiddenException(
        'Access denied: You cannot view another student’s certificate',
      );
    }

    return cert.toSafeCertificate(this.getBaseUrl());
  }

  // ==========================================
  // PUBLIC VERIFICATION (NO AUTH REQUIRED)
  // ==========================================

  async verifyPublicCertificate(
    certificateNumber: string,
  ): Promise<PublicCertificateVerificationDto> {
    const cleanNumber = certificateNumber.trim().toUpperCase();

    const cert = await this.certificateRepository.findOne({
      where: { certificateNumber: cleanNumber },
      relations: { course: true, student: true },
    });

    if (!cert) {
      throw new NotFoundException(
        'Certificate not found or invalid certificate number',
      );
    }

    return cert.toPublicVerification();
  }

  // ==========================================
  // PDF GENERATION & DOWNLOAD
  // ==========================================

  async downloadCertificatePdf(
    userId: string,
    userRole: UserRole,
    certificateId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const cert = await this.certificateRepository.findOne({
      where: { id: certificateId },
      relations: { course: true, student: true },
    });

    if (!cert) {
      throw new NotFoundException(`Certificate with ID "${certificateId}" not found`);
    }

    // Privacy check
    if (userRole === UserRole.STUDENT && cert.studentId !== userId) {
      throw new ForbiddenException(
        'Access denied: You cannot download another student’s certificate',
      );
    }

    // Revocation check
    if (cert.status === CertificateStatus.REVOKED) {
      throw new BadRequestException(
        'Cannot download a revoked certificate. This credential is no longer valid.',
      );
    }

    const verificationUrl = `${this.getBaseUrl()}/verify/${cert.certificateNumber}`;
    const buffer = await this.generatePdfBuffer(
      cert.student.fullName,
      cert.course.title,
      cert.certificateNumber,
      cert.issuedAt,
      verificationUrl,
    );

    return {
      buffer,
      filename: `certificate-${cert.certificateNumber}.pdf`,
    };
  }

  private generatePdfBuffer(
    recipientName: string,
    courseTitle: string,
    certificateNumber: string,
    issuedAt: Date,
    verificationUrl: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Landscape A4: 841.89 x 595.28
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margin: 40,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = 841.89;
      const pageHeight = 595.28;

      // Outer Decorative Border
      doc
        .rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(4)
        .strokeColor('#0f172a') // Deep slate navy
        .stroke();

      // Inner Accent Border
      doc
        .rect(38, 38, pageWidth - 76, pageHeight - 76)
        .lineWidth(1.5)
        .strokeColor('#d97706') // Warm amber / gold
        .stroke();

      // Header Brand
      doc
        .moveDown(1.5)
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#64748b')
        .text('ONLINE COURSE MANAGEMENT SYSTEM', {
          align: 'center',
          characterSpacing: 3,
        });

      doc.moveDown(0.5);

      // Certificate Title
      doc
        .font('Helvetica-Bold')
        .fontSize(28)
        .fillColor('#0f172a')
        .text('CERTIFICATE OF COMPLETION', {
          align: 'center',
          characterSpacing: 1.5,
        });

      doc.moveDown(0.8);

      // Subtitle
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#475569')
        .text('This is to certify that', {
          align: 'center',
        });

      doc.moveDown(0.8);

      // Recipient Name
      doc
        .font('Helvetica-Bold')
        .fontSize(26)
        .fillColor('#0284c7') // Sky cyan / royal primary
        .text(recipientName, {
          align: 'center',
        });

      // Horizontal Divider under Name
      const textWidth = doc.widthOfString(recipientName);
      const lineX = (pageWidth - Math.max(textWidth, 300)) / 2;
      doc
        .moveTo(lineX, doc.y + 4)
        .lineTo(lineX + Math.max(textWidth, 300), doc.y + 4)
        .lineWidth(1)
        .strokeColor('#cbd5e1')
        .stroke();

      doc.moveDown(1.0);

      // Conferred Text
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#475569')
        .text('has successfully completed all required curriculum units and assessments for', {
          align: 'center',
        });

      doc.moveDown(0.6);

      // Course Title
      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor('#0f172a')
        .text(courseTitle, {
          align: 'center',
        });

      doc.moveDown(1.5);

      // Footer Information Block (Issue Date & Certificate ID)
      const formattedDate = new Date(issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const footerY = pageHeight - 110;

      // Left: Date
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#0f172a')
        .text(`ISSUED ON: ${formattedDate}`, 60, footerY);

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#64748b')
        .text('Verified Educational Record', 60, footerY + 14);

      // Right: Certificate ID & Verification URL
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#0f172a')
        .text(`CREDENTIAL ID: ${certificateNumber}`, pageWidth - 360, footerY, {
          width: 300,
          align: 'right',
        });

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#0284c7')
        .text(`Verify: ${verificationUrl}`, pageWidth - 360, footerY + 14, {
          width: 300,
          align: 'right',
        });

      doc.end();
    });
  }

  // ==========================================
  // ADMINISTRATIVE REVOCATION (ADMIN ONLY)
  // ==========================================

  async revokeCertificate(
    adminId: string,
    certificateId: string,
    reason?: string,
  ): Promise<SafeCertificateDto> {
    const cert = await this.certificateRepository.findOne({
      where: { id: certificateId },
      relations: { course: true, student: true },
    });

    if (!cert) {
      throw new NotFoundException(`Certificate with ID "${certificateId}" not found`);
    }

    cert.status = CertificateStatus.REVOKED;
    cert.revokedAt = new Date();
    cert.revocationReason = reason?.trim() || 'Revoked by administrative authority';

    const saved = await this.certificateRepository.save(cert);

    // Audit log (certificate revocation)
    void this.auditLogService.log({
      actorId: adminId,
      action: AuditAction.CERTIFICATE_REVOKED,
      resourceType: AuditResourceType.CERTIFICATE,
      resourceId: saved.id,
      metadata: {
        certificateNumber: saved.certificateNumber,
        reason: saved.revocationReason,
      },
    });

    this.logger.warn(
      `Certificate [${saved.certificateNumber}] REVOKED by Admin [${adminId}]. Reason: ${saved.revocationReason}`,
    );

    return saved.toSafeCertificate(this.getBaseUrl());
  }
}
