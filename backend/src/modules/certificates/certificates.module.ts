import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from './entities/certificate.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Course } from '../courses/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { ProgressModule } from '../progress/progress.module';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './controllers/certificates.controller';
import { EnrollmentCertificatesController } from './controllers/enrollment-certificates.controller';
import { PublicCertificatesController } from './controllers/public-certificates.controller';
import { AdminCertificatesController } from './controllers/admin-certificates.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Certificate,
      Enrollment,
      Course,
      User,
      Quiz,
      QuizAttempt,
    ]),
    ProgressModule,
    NotificationsModule,
    AuditLogModule,
  ],
  controllers: [
    CertificatesController,
    EnrollmentCertificatesController,
    PublicCertificatesController,
    AdminCertificatesController,
  ],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
