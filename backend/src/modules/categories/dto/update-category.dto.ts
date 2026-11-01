import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    example: 'Web Development & Cloud',
    description: 'Updated name of the category',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Category name must be at least 2 characters' })
  @MaxLength(100, { message: 'Category name cannot exceed 100 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated description of web development courses.',
    description: 'Updated description of the category',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
