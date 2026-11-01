import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonProgressStatus } from '../enums/lesson-progress-status.enum';
import { CourseProgressSummaryDto } from './course-progress-summary.dto';

export class SafeLessonProgressDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  studentId: string;

  @ApiProperty({ format: 'uuid' })
  lessonId: string;

  @ApiProperty({ format: 'uuid' })
  enrollmentId: string;

  @ApiProperty({ enum: LessonProgressStatus })
  status: LessonProgressStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  startedAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  completedAt?: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  lastAccessedAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class LessonProgressActionResponseDto {
  @ApiProperty({ type: SafeLessonProgressDto })
  progress: SafeLessonProgressDto;

  @ApiProperty({ example: 'Lesson marked as completed successfully.' })
  message: string;

  @ApiPropertyOptional({ type: () => CourseProgressSummaryDto })
  courseProgress?: CourseProgressSummaryDto;
}
