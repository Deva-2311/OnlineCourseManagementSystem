import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { Skill } from '../skills/entities/skill.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { LessonProgress } from '../progress/entities/lesson-progress.entity';
import { Course } from '../courses/entities/course.entity';
import { Payment } from '../payments/entities/payment.entity';
import { LearningInsightsService } from './learning-insights.service';
import { LearningInsightsController } from './controllers/learning-insights.controller';
import { LearningPathsController } from './controllers/learning-paths.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuizAttempt,
      Quiz,
      Skill,
      Enrollment,
      LessonProgress,
      Course,
      Payment,
    ]),
  ],
  controllers: [LearningInsightsController, LearningPathsController],
  providers: [LearningInsightsService],
  exports: [LearningInsightsService],
})
export class LearningInsightsModule {}
