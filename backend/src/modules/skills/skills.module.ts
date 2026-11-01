import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from './entities/skill.entity';
import { QuizQuestion } from '../quizzes/entities/quiz-question.entity';
import { Lesson } from '../curriculum/entities/lesson.entity';
import { Course } from '../courses/entities/course.entity';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Skill, QuizQuestion, Lesson, Course])],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
