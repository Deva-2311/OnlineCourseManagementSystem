import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quiz } from './entities/quiz.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuestionOption } from './entities/question-option.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { StudentAnswer } from './entities/student-answer.entity';
import { Lesson } from '../curriculum/entities/lesson.entity';
import { Course } from '../courses/entities/course.entity';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { AuthModule } from '../auth/auth.module';
import { QuizzesService } from './quizzes.service';
import { InstructorQuizzesController } from './controllers/instructor-quizzes.controller';
import { QuizzesController } from './controllers/quizzes.controller';
import { QuizAttemptsController } from './controllers/quiz-attempts.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quiz,
      QuizQuestion,
      QuestionOption,
      QuizAttempt,
      StudentAnswer,
      Lesson,
      Course,
    ]),
    EnrollmentsModule,
    AuthModule,
    NotificationsModule,
  ],
  controllers: [
    InstructorQuizzesController,
    QuizzesController,
    QuizAttemptsController,
  ],
  providers: [QuizzesService],
  exports: [QuizzesService, TypeOrmModule],
})
export class QuizzesModule {}
