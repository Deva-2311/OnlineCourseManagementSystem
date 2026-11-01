import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MinLength,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '../enums/question-type.enum';
import { CreateOptionDto } from './create-question.dto';

export class UpdateQuestionDto {
  @ApiPropertyOptional({
    description: 'The updated question prompt text',
    example: 'Which consistency model requires immediate linearizability across all nodes?',
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'questionText must be at least 3 characters long' })
  questionText?: string;

  @ApiPropertyOptional({
    enum: QuestionType,
    description: 'Objective question type: MULTIPLE_CHOICE or TRUE_FALSE',
  })
  @IsOptional()
  @IsEnum(QuestionType, { message: 'questionType must be MULTIPLE_CHOICE or TRUE_FALSE' })
  questionType?: QuestionType;

  @ApiPropertyOptional({
    description: 'Point value awarded for correctly answering this question',
    example: 2,
  })
  @IsOptional()
  @IsInt({ message: 'points must be an integer' })
  @Min(1, { message: 'points must be at least 1' })
  points?: number;

  @ApiPropertyOptional({
    description: 'Display order of the question in the quiz',
    example: 0,
  })
  @IsOptional()
  @IsInt({ message: 'displayOrder must be an integer' })
  @Min(0, { message: 'displayOrder cannot be negative' })
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Optional explanation shown to instructors or in reviews',
    example: 'Strict consistency enforces immediate wall-clock linearization.',
  })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({
    type: [CreateOptionDto],
    description: 'Answer choices (if updating choices: minimum 2 options; exactly one must be marked isCorrect: true)',
  })
  @IsOptional()
  @IsArray({ message: 'options must be an array' })
  @ArrayMinSize(2, { message: 'At least 2 answer options are required when providing options' })
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options?: CreateOptionDto[];
}
