import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength, MaxLength, IsInt, Min } from 'class-validator';

export class CreateSectionDto {
  @ApiProperty({
    description: 'Title of the course curriculum section',
    example: 'Module 1: Introduction to System Architecture',
  })
  @IsString()
  @IsNotEmpty({ message: 'Section title is required' })
  @MinLength(2, { message: 'Section title must be at least 2 characters long' })
  @MaxLength(255, { message: 'Section title cannot exceed 255 characters' })
  title: string;

  @ApiPropertyOptional({
    description: 'Optional description of the section content and objectives',
    example: 'Foundational concepts and principles of large scale distributed systems',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Zero-based display order index for sequencing sections within the course',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'displayOrder must be an integer' })
  @Min(0, { message: 'displayOrder cannot be negative' })
  displayOrder?: number;
}
