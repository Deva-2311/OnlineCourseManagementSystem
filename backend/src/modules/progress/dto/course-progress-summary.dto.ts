import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonProgressStatus } from '../enums/lesson-progress-status.enum';

export class LessonQuizSummaryDto {
  @ApiProperty({ format: 'uuid' })
  quizId: string;

  @ApiProperty({ example: 'Module 1 Assessment' })
  title: string;

  @ApiProperty({ example: true })
  isPassed: boolean;

  @ApiProperty({ example: 85.0 })
  highestScore: number;

  @ApiProperty({ example: 100.0 })
  maxScore: number;

  @ApiProperty({ example: 2 })
  attemptsCount: number;
}

export class LessonProgressDetailDto {
  @ApiProperty({ format: 'uuid' })
  lessonId: string;

  @ApiProperty({ example: 'Introduction to RISC-V' })
  title: string;

  @ApiProperty({ format: 'uuid' })
  sectionId: string;

  @ApiProperty({ example: 'Section 1: Foundations' })
  sectionTitle: string;

  @ApiProperty({ example: 0 })
  displayOrder: number;

  @ApiProperty({ enum: LessonProgressStatus })
  status: LessonProgressStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  startedAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  completedAt?: Date | null;

  @ApiPropertyOptional({ type: [LessonQuizSummaryDto] })
  quizzes?: LessonQuizSummaryDto[];
}

export class CourseProgressSummaryDto {
  @ApiProperty({ format: 'uuid' })
  courseId: string;

  @ApiProperty({ format: 'uuid' })
  enrollmentId: string;

  @ApiProperty({ example: 12 })
  totalLessons: number;

  @ApiProperty({ example: 6 })
  completedLessons: number;

  @ApiProperty({ example: 2 })
  inProgressLessons: number;

  @ApiProperty({ example: 6 })
  remainingLessons: number;

  @ApiProperty({ example: 50.0 })
  completionPercentage: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastActivityAt: Date | null;

  @ApiProperty({ example: false })
  isCompleted: boolean;

  @ApiPropertyOptional({ type: [LessonProgressDetailDto] })
  lessons?: LessonProgressDetailDto[];
}
