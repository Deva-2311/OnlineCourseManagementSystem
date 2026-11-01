import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { Course } from '../courses/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './controllers/enrollments.controller';
import { InstructorEnrollmentsController } from './controllers/instructor-enrollments.controller';
import { AdminEnrollmentsController } from './controllers/admin-enrollments.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, Course, User]),
    AuthModule,
    NotificationsModule,
    AuditLogModule,
  ],
  controllers: [
    EnrollmentsController,
    InstructorEnrollmentsController,
    AdminEnrollmentsController,
  ],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService, TypeOrmModule],
})
export class EnrollmentsModule {}
