import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Web Development',
    description: 'Unique name of the category',
  })
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  @MinLength(2, { message: 'Category name must be at least 2 characters' })
  @MaxLength(100, { message: 'Category name cannot exceed 100 characters' })
  name: string;

  @ApiPropertyOptional({
    example: 'Courses covering frontend, backend, and full stack web development technologies.',
    description: 'Brief description of the category',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
