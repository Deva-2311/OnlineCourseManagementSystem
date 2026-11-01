import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseSection } from './entities/course-section.entity';
import { Lesson } from './entities/lesson.entity';
import { Course } from '../courses/entities/course.entity';
import { CurriculumService } from './curriculum.service';
import { InstructorCurriculumController } from './controllers/instructor-curriculum.controller';
import { CurriculumController } from './controllers/curriculum.controller';
import { CoursesModule } from '../courses/courses.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CourseSection, Lesson, Course]),
    CoursesModule,
    EnrollmentsModule,
    AuthModule,
  ],
  controllers: [InstructorCurriculumController, CurriculumController],
  providers: [CurriculumService],
  exports: [CurriculumService, TypeOrmModule],
})
export class CurriculumModule {}
