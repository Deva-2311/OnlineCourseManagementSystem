import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonContentType } from '../enums/lesson-content-type.enum';

export class SafeLessonDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sectionId: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty({ enum: LessonContentType })
  contentType: LessonContentType;

  @ApiProperty()
  estimatedDuration: number;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  sequenceOrder: number;

  @ApiProperty()
  isPreview: boolean;

  @ApiProperty()
  isUnlocked: boolean;

  @ApiPropertyOptional({ nullable: true })
  textContent?: string | null;

  @ApiPropertyOptional({ nullable: true })
  videoUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  contentUrl?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SafeSectionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  courseId: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  sequenceOrder: number;

  @ApiProperty({ type: [SafeLessonDto] })
  lessons: SafeLessonDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CurriculumOutlineDto {
  @ApiProperty()
  courseId: string;

  @ApiProperty()
  courseTitle: string;

  @ApiProperty()
  hasAccess: boolean;

  @ApiProperty({ type: [SafeSectionDto] })
  sections: SafeSectionDto[];
}
