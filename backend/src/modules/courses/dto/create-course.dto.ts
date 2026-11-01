import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel } from '../enums/difficulty-level.enum';

export class CreateCourseDto {
  @ApiProperty({
    example: 'Full Stack Web Development with React & NestJS',
    description: 'Title of the course',
  })
  @IsString()
  @IsNotEmpty({ message: 'Course title is required' })
  @MinLength(5, { message: 'Course title must be at least 5 characters' })
  @MaxLength(255, { message: 'Course title cannot exceed 255 characters' })
  title: string;

  @ApiPropertyOptional({
    example: 'Learn to build complete web applications from scratch.',
    description: 'Concise summary of the course content',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Short description cannot exceed 500 characters' })
  shortDescription?: string;

  @ApiProperty({
    example: 'A comprehensive, deep-dive curriculum designed to take developers from beginners to advanced full-stack professionals.',
    description: 'Full course overview and syllabus description',
  })
  @IsString()
  @IsNotEmpty({ message: 'Course description is required' })
  @MinLength(20, { message: 'Course description must be at least 20 characters' })
  description: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee',
    description: 'Course promotional banner/thumbnail URL',
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the category this course belongs to',
  })
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId: string;

  @ApiPropertyOptional({
    enum: DifficultyLevel,
    default: DifficultyLevel.BEGINNER,
    description: 'Target difficulty level of the course',
  })
  @IsOptional()
  @IsEnum(DifficultyLevel, { message: 'difficultyLevel must be Beginner, Intermediate, or Advanced' })
  difficultyLevel?: DifficultyLevel;

  @ApiPropertyOptional({
    example: 45,
    description: 'Estimated completion duration in hours',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'estimatedDuration must be a number' })
  @Min(0, { message: 'estimatedDuration cannot be negative' })
  estimatedDuration?: number;

  @ApiPropertyOptional({
    example: 89.99,
    description: 'Price of the course (0.00 for free courses)',
    default: 0.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price must be a valid monetary decimal with max 2 decimals' })
  @Min(0, { message: 'price cannot be negative' })
  price?: number;

  @ApiPropertyOptional({
    example: 'USD',
    default: 'USD',
    description: 'ISO currency code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({
    example: ['Basic HTML knowledge', 'Familiarity with terminal'],
    description: 'List of prerequisites required before taking the course',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiPropertyOptional({
    example: ['Build real-world NestJS APIs', 'Deploy Next.js apps with confidence'],
    description: 'Key skills and outcomes students achieve upon completion',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningOutcomes?: string[];
}
