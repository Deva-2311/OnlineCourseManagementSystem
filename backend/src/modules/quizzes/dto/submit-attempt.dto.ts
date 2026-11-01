import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StudentAnswerSubmissionDto {
  @ApiProperty({
    description: 'UUID of the question being answered',
    example: 'd9b3a4e2-4567-4e89-b123-456789abcdef',
  })
  @IsUUID('4', { message: 'questionId must be a valid UUID' })
  @IsNotEmpty({ message: 'questionId is required' })
  questionId: string;

  @ApiPropertyOptional({
    description: 'UUID of the selected option (omitted or null if unanswered/skipped)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID('4', { message: 'selectedOptionId must be a valid UUID' })
  selectedOptionId?: string;
}

export class SubmitQuizAttemptDto {
  @ApiProperty({
    type: [StudentAnswerSubmissionDto],
    description: 'Array of student answers for questions in the quiz',
  })
  @IsArray({ message: 'answers must be an array' })
  @ValidateNested({ each: true })
  @Type(() => StudentAnswerSubmissionDto)
  answers: StudentAnswerSubmissionDto[];
}
