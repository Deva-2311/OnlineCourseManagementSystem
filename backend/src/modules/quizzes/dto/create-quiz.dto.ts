import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class CreateQuizDto {
  @ApiProperty({
    description: 'Title of the quiz assessment',
    example: 'Quiz 1: Microservices Architecture Fundamentals',
  })
  @IsString()
  @IsNotEmpty({ message: 'Quiz title is required' })
  @MinLength(2, { message: 'Quiz title must be at least 2 characters long' })
  @MaxLength(255, { message: 'Quiz title cannot exceed 255 characters' })
  title: string;

  @ApiPropertyOptional({
    description: 'Guidelines and instructions for taking the quiz',
    example: 'Answer all 5 multiple choice questions. Passing score is 70%.',
  })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({
    description: 'Time limit in minutes (null for untimed quiz)',
    example: 15,
  })
  @IsOptional()
  @IsInt({ message: 'timeLimitMinutes must be an integer' })
  @Min(1, { message: 'timeLimitMinutes must be at least 1 minute' })
  timeLimitMinutes?: number;

  @ApiPropertyOptional({
    description: 'Maximum attempts allowed per student',
    example: 3,
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'maxAttempts must be an integer' })
  @Min(1, { message: 'maxAttempts must be at least 1' })
  maxAttempts?: number;

  @ApiPropertyOptional({
    description: 'Passing percentage threshold (0 to 100)',
    example: 70.0,
    default: 70.0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'passingScore must be a number' })
  @Min(0, { message: 'passingScore cannot be negative' })
  @Max(100, { message: 'passingScore cannot exceed 100' })
  passingScore?: number;

  @ApiPropertyOptional({
    description: 'Publication state: students can only attempt published quizzes',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPublished must be a boolean' })
  isPublished?: boolean;
}
