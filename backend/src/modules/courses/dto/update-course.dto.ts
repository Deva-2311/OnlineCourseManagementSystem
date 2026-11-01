import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel } from '../enums/difficulty-level.enum';

export class UpdateCourseDto {
  @ApiPropertyOptional({
    example: 'Full Stack Web Development with React & NestJS',
    description: 'Updated title of the course',
  })
  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Course title must be at least 5 characters' })
  @MaxLength(255, { message: 'Course title cannot exceed 255 characters' })
  title?: string;

  @ApiPropertyOptional({
    example: 'Learn to build complete web applications from scratch.',
    description: 'Updated short description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Short description cannot exceed 500 characters' })
  shortDescription?: string;

  @ApiPropertyOptional({
    example: 'Updated complete overview and syllabus description of the course curriculum.',
    description: 'Updated full course description',
  })
  @IsOptional()
  @IsString()
  @MinLength(20, { message: 'Course description must be at least 20 characters' })
  description?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee',
    description: 'Updated course thumbnail URL',
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Updated category UUID',
  })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId?: string;

  @ApiPropertyOptional({
    enum: DifficultyLevel,
    description: 'Updated difficulty level',
  })
  @IsOptional()
  @IsEnum(DifficultyLevel, { message: 'difficultyLevel must be Beginner, Intermediate, or Advanced' })
  difficultyLevel?: DifficultyLevel;

  @ApiPropertyOptional({
    example: 50,
    description: 'Updated duration in hours',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'estimatedDuration must be a number' })
  @Min(0, { message: 'estimatedDuration cannot be negative' })
  estimatedDuration?: number;

  @ApiPropertyOptional({
    example: 99.99,
    description: 'Updated price',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price must be a valid monetary decimal with max 2 decimals' })
  @Min(0, { message: 'price cannot be negative' })
  price?: number;

  @ApiPropertyOptional({
    example: 'USD',
    description: 'Updated currency code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({
    example: ['Basic JavaScript knowledge'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiPropertyOptional({
    example: ['Build real-world NestJS APIs'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningOutcomes?: string[];
}
