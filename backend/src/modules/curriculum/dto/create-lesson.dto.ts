import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
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

export class CreateLessonDto {
  @ApiProperty({
    description: 'Title of the lesson',
    example: '1.1 Monoliths vs. Event-Driven Microservices',
  })
  @IsString()
  @IsNotEmpty({ message: 'Lesson title is required' })
  @MinLength(2, { message: 'Lesson title must be at least 2 characters long' })
  @MaxLength(255, { message: 'Lesson title cannot exceed 255 characters' })
  title: string;

  @ApiPropertyOptional({
    description: 'Summary or overview of what this lesson covers',
    example: 'Comparative trade-offs between monolithic architectures and decentralized microservices',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: LessonContentType,
    description: 'Format of the learning material (VIDEO, TEXT, or PDF)',
    example: LessonContentType.VIDEO,
    default: LessonContentType.VIDEO,
  })
  @IsEnum(LessonContentType, { message: 'contentType must be VIDEO, TEXT, or PDF' })
  contentType: LessonContentType;

  @ApiPropertyOptional({
    description: 'Text or Markdown content for reading-based lessons',
    example: '### Architectural Principles\n\nMicroservices provide independent scaling and deployment velocity...',
  })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({
    description: 'Secure HTTP/HTTPS streaming or hosted video URL',
    example: 'https://cdn.ocms.edu/videos/lesson-1-1.mp4',
  })
  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'videoUrl must be a valid HTTP or HTTPS URL' },
  )
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'External resource or PDF document URL',
    example: 'https://cdn.ocms.edu/docs/microservices-spec.pdf',
  })
  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'contentUrl must be a valid HTTP or HTTPS URL' },
  )
  contentUrl?: string;

  @ApiPropertyOptional({
    description: 'Estimated lesson duration in minutes',
    example: 25,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'estimatedDuration must be an integer' })
  @Min(0, { message: 'estimatedDuration cannot be negative' })
  estimatedDuration?: number;

  @ApiPropertyOptional({
    description: 'Zero-based display order index for sequencing lessons within the section',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'displayOrder must be an integer' })
  @Min(0, { message: 'displayOrder cannot be negative' })
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether this lesson is accessible as a free sample preview to prospective students',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPreview must be a boolean value' })
  isPreview?: boolean;
}
