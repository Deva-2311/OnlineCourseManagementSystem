import { ApiProperty } from '@nestjs/swagger';
import { SkillProficiencyStatus } from '../enums/skill-proficiency-status.enum';

export class SkillProficiencyItemDto {
  @ApiProperty({ description: 'Skill UUID or generated topic identifier' })
  skillId: string;

  @ApiProperty({ description: 'Name of the assessed skill or topic' })
  skillName: string;

  @ApiProperty({
    enum: SkillProficiencyStatus,
    description: 'Calculated mastery status based on empirical quiz answer evidence',
  })
  status: SkillProficiencyStatus;

  @ApiProperty({
    description: 'Percentage accuracy score (0-100), or null if insufficient data',
    nullable: true,
  })
  masteryScore: number | null;

  @ApiProperty({ description: 'Total distinct questions answered for this skill' })
  totalQuestionsAttempted: number;

  @ApiProperty({ description: 'Number of correctly answered questions' })
  correctAnswersCount: number;

  @ApiProperty({
    description: 'Timestamp of the most recent assessment containing this skill',
    nullable: true,
  })
  lastAssessedAt: Date | null;

  @ApiProperty({ description: 'Human-readable explanation of the data evidence' })
  evidenceSummary: string;
}

export class LearningInsightsSummaryDto {
  @ApiProperty({ description: 'Total skills or topics assessed' })
  totalSkillsAssessed: number;

  @ApiProperty({ description: 'Count of skills with accuracy >= 80%' })
  strongSkillsCount: number;

  @ApiProperty({ description: 'Count of skills with accuracy between 50% and 79%' })
  developingSkillsCount: number;

  @ApiProperty({ description: 'Count of identified skill gaps (accuracy < 50%)' })
  needsImprovementCount: number;

  @ApiProperty({ description: 'Count of skills with fewer than minimum required answers' })
  insufficientDataCount: number;
}

export class LearningInsightsResponseDto {
  @ApiProperty({ type: LearningInsightsSummaryDto })
  summary: LearningInsightsSummaryDto;

  @ApiProperty({ type: [SkillProficiencyItemDto] })
  skills: SkillProficiencyItemDto[];
}
