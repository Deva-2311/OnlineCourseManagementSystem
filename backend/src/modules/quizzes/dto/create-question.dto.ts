import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '../enums/question-type.enum';

export class CreateOptionDto {
  @ApiProperty({
    description: 'Text of the answer choice',
    example: 'Eventual consistency guarantees that all replicas converge eventually.',
  })
  @IsString()
  @IsNotEmpty({ message: 'optionText is required' })
  optionText: string;

  @ApiProperty({
    description: 'Indicates whether this option is the correct answer key',
    example: true,
  })
  @IsBoolean({ message: 'isCorrect must be a boolean' })
  isCorrect: boolean;

  @ApiPropertyOptional({
    description: 'Display order index for the option',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'displayOrder must be an integer' })
  @Min(0, { message: 'displayOrder cannot be negative' })
  displayOrder?: number;
}

export class CreateQuestionDto {
  @ApiProperty({
    description: 'The question prompt text',
    example: 'Which consistency model requires immediate linearizability across all nodes?',
  })
  @IsString()
  @IsNotEmpty({ message: 'questionText is required' })
  @MinLength(3, { message: 'questionText must be at least 3 characters long' })
  questionText: string;

  @ApiProperty({
    enum: QuestionType,
    description: 'Objective question type: MULTIPLE_CHOICE or TRUE_FALSE',
    example: QuestionType.MULTIPLE_CHOICE,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  @IsEnum(QuestionType, { message: 'questionType must be MULTIPLE_CHOICE or TRUE_FALSE' })
  questionType: QuestionType;

  @ApiPropertyOptional({
    description: 'Point value awarded for correctly answering this question',
    example: 2,
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'points must be an integer' })
  @Min(1, { message: 'points must be at least 1' })
  points?: number;

  @ApiPropertyOptional({
    description: 'Display order of the question in the quiz',
    example: 0,
    default: 0,
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

  @ApiProperty({
    type: [CreateOptionDto],
    description: 'Answer choices (minimum 2 options; exactly one must be marked isCorrect: true)',
  })
  @IsArray({ message: 'options must be an array' })
  @ArrayMinSize(2, { message: 'At least 2 answer options are required for objective questions' })
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options: CreateOptionDto[];
}
