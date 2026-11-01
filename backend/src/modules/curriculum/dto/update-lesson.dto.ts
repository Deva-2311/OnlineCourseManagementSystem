import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsUrl,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { LessonContentType } from '../enums/lesson-content-type.enum';

export class UpdateLessonDto {
  @ApiPropertyOptional({
    description: 'Updated title of the lesson',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Lesson title must be at least 2 characters long' })
  @MaxLength(255, { message: 'Lesson title cannot exceed 255 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the lesson',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: LessonContentType,
    description: 'Updated content type of the lesson',
  })
  @IsOptional()
  @IsEnum(LessonContentType, { message: 'contentType must be VIDEO, TEXT, or PDF' })
  contentType?: LessonContentType;

  @ApiPropertyOptional({
    description: 'Updated text content of the lesson',
  })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({
    description: 'Updated secure streaming video URL',
  })
  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'videoUrl must be a valid HTTP or HTTPS URL' },
  )
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Updated document or resource URL',
  })
  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'contentUrl must be a valid HTTP or HTTPS URL' },
  )
  contentUrl?: string;

  @ApiPropertyOptional({
    description: 'Updated estimated duration in minutes',
  })
  @IsOptional()
  @IsInt({ message: 'estimatedDuration must be an integer' })
  @Min(0, { message: 'estimatedDuration cannot be negative' })
  estimatedDuration?: number;

  @ApiPropertyOptional({
    description: 'Updated display order index',
  })
  @IsOptional()
  @IsInt({ message: 'displayOrder must be an integer' })
  @Min(0, { message: 'displayOrder cannot be negative' })
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Updated preview availability flag',
  })
  @IsOptional()
  @IsBoolean({ message: 'isPreview must be a boolean value' })
  isPreview?: boolean;
}
