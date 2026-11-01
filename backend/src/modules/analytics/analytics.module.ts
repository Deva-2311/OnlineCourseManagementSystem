import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { LessonProgress } from '../progress/entities/lesson-progress.entity';
import { AnalyticsService } from './analytics.service';
import {
  AdminAnalyticsController,
  InstructorAnalyticsController,
  StudentAnalyticsController,
} from './analytics.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Course,
      Enrollment,
      Payment,
      Certificate,
      QuizAttempt,
      LessonProgress,
    ]),
    AuthModule,
  ],
  controllers: [
    AdminAnalyticsController,
    InstructorAnalyticsController,
    StudentAnalyticsController,
  ],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
