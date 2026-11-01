import { ApiProperty } from '@nestjs/swagger';
import { LearningStepType } from '../enums/learning-step-type.enum';
import { AccessStatus } from '../enums/access-status.enum';

export class TargetSkillSummaryDto {
  @ApiProperty({ description: 'Target skill UUID', nullable: true })
  id?: string | null;

  @ApiProperty({ description: 'Target skill or topic name' })
  name: string;
}

export class LearningPathReferenceDto {
  @ApiProperty({ description: 'Associated Course UUID', nullable: true })
  courseId?: string;

  @ApiProperty({ description: 'Associated Course title', nullable: true })
  courseTitle?: string;

  @ApiProperty({ description: 'Associated Section UUID', nullable: true })
  sectionId?: string;

  @ApiProperty({ description: 'Associated Lesson UUID', nullable: true })
  lessonId?: string;

  @ApiProperty({ description: 'Associated Quiz UUID', nullable: true })
  quizId?: string;

  @ApiProperty({ description: 'Course tuition price', nullable: true })
  price?: number;

  @ApiProperty({ description: 'Indicates if course is free', nullable: true })
  isFree?: boolean;
}

export class LearningPathStepDto {
  @ApiProperty({ description: 'Step unique identifier' })
  id: string;

  @ApiProperty({ enum: LearningStepType, description: 'Type of adaptive learning suggestion' })
  stepType: LearningStepType;

  @ApiProperty({ description: 'Title of the recommended item or action' })
  title: string;

  @ApiProperty({ description: 'Short description of the curriculum content' })
  description: string;

  @ApiProperty({ description: 'Explainable, data-backed rationale for the recommendation' })
  reason: string;

  @ApiProperty({ type: TargetSkillSummaryDto, nullable: true })
  targetSkill?: TargetSkillSummaryDto | null;

  @ApiProperty({ enum: AccessStatus, description: 'Content access availability for authenticated student' })
  accessStatus: AccessStatus;

  @ApiProperty({ type: LearningPathReferenceDto })
  reference: LearningPathReferenceDto;

  @ApiProperty({ description: 'Client routing URL for the recommended action' })
  actionUrl: string;

  @ApiProperty({ description: 'Calculated progression priority order (1 is highest)' })
  priority: number;
}

export class LearningPathMetaDto {
  @ApiProperty({ description: 'Total recommended steps generated' })
  totalSteps: number;

  @ApiProperty({ description: 'Indicates if student has active skill gaps needing improvement' })
  hasSkillGaps: boolean;

  @ApiProperty({ description: 'Indicates if fallback curriculum roadmap was applied' })
  isFallback: boolean;
}

export class LearningPathResponseDto {
  @ApiProperty({ type: [LearningPathStepDto] })
  data: LearningPathStepDto[];

  @ApiProperty({ type: LearningPathMetaDto })
  meta: LearningPathMetaDto;
}
