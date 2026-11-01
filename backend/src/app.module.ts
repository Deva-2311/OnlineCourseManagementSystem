import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { validate } from './config/environment.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CoursesModule } from './modules/courses/courses.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CurriculumModule } from './modules/curriculum/curriculum.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { ProgressModule } from './modules/progress/progress.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { SkillsModule } from './modules/skills/skills.module';
import { LearningInsightsModule } from './modules/learning-insights/learning-insights.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: (configService.get<number>('throttle.ttl') || 60) * 1000,
          limit: configService.get<number>('throttle.limit') || 20,
        },
      ],
    }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    CoursesModule,
    EnrollmentsModule,
    PaymentsModule,
    CurriculumModule,
    QuizzesModule,
    ProgressModule,
    CertificatesModule,
    RecommendationsModule,
    SkillsModule,
    LearningInsightsModule,
    NotificationsModule,
    AnalyticsModule,
    AuditLogModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
