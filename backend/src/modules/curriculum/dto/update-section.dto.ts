import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, MaxLength, IsInt, Min } from 'class-validator';

export class UpdateSectionDto {
  @ApiPropertyOptional({
    description: 'Updated title of the course curriculum section',
    example: 'Module 1: Advanced Microservices',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Section title must be at least 2 characters long' })
  @MaxLength(255, { message: 'Section title cannot exceed 255 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the section content and objectives',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated display order index for the section',
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: 'displayOrder must be an integer' })
  @Min(0, { message: 'displayOrder cannot be negative' })
  displayOrder?: number;
}
