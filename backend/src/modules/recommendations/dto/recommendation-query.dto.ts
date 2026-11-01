import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { DifficultyLevel } from '../../courses/enums/difficulty-level.enum';

export class RecommendationQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of course recommendations to return (1-20)',
    default: 6,
    minimum: 1,
    maximum: 20,
    example: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(20, { message: 'limit cannot exceed 20' })
  limit?: number = 6;

  @ApiPropertyOptional({
    description: 'Filter recommendations by Category UUID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID v4' })
  categoryId?: string;

  @ApiPropertyOptional({
    enum: DifficultyLevel,
    description: 'Filter recommendations by Difficulty Level',
    example: DifficultyLevel.INTERMEDIATE,
  })
  @IsOptional()
  @IsEnum(DifficultyLevel, {
    message: 'difficultyLevel must be Beginner, Intermediate, or Advanced',
  })
  difficultyLevel?: DifficultyLevel;
}
