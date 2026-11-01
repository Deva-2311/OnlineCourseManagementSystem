import { ApiPropertyOptional } from '@nestjs/swagger';
import {
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

export class UpdateQuizDto {
  @ApiPropertyOptional({
    description: 'Updated title of the quiz assessment',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Quiz title must be at least 2 characters long' })
  @MaxLength(255, { message: 'Quiz title cannot exceed 255 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated instructions',
  })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({
    description: 'Updated time limit in minutes (null for untimed)',
  })
  @IsOptional()
  @IsInt({ message: 'timeLimitMinutes must be an integer' })
  @Min(1, { message: 'timeLimitMinutes must be at least 1 minute' })
  timeLimitMinutes?: number;

  @ApiPropertyOptional({
    description: 'Updated maximum attempts allowed per student',
  })
  @IsOptional()
  @IsInt({ message: 'maxAttempts must be an integer' })
  @Min(1, { message: 'maxAttempts must be at least 1' })
  maxAttempts?: number;

  @ApiPropertyOptional({
    description: 'Updated passing percentage threshold',
  })
  @IsOptional()
  @IsNumber({}, { message: 'passingScore must be a number' })
  @Min(0, { message: 'passingScore cannot be negative' })
  @Max(100, { message: 'passingScore cannot exceed 100' })
  passingScore?: number;

  @ApiPropertyOptional({
    description: 'Updated publication state',
  })
  @IsOptional()
  @IsBoolean({ message: 'isPublished must be a boolean' })
  isPublished?: boolean;
}
