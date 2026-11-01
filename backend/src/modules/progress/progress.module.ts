import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonProgress } from './entities/lesson-progress.entity';
import { Lesson } from '../curriculum/entities/lesson.entity';
import { CourseSection } from '../curriculum/entities/course-section.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Course } from '../courses/entities/course.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { ProgressService } from './progress.service';
import { LessonsProgressController } from './controllers/lessons-progress.controller';
import { EnrollmentsProgressController } from './controllers/enrollments-progress.controller';
import { InstructorProgressController } from './controllers/instructor-progress.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LessonProgress,
      Lesson,
      CourseSection,
      Enrollment,
      Course,
      Quiz,
      QuizAttempt,
    ]),
  ],
  controllers: [
    LessonsProgressController,
    EnrollmentsProgressController,
    InstructorProgressController,
  ],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
