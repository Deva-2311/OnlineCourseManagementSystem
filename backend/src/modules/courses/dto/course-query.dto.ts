import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel } from '../enums/difficulty-level.enum';

export enum CourseSort {
  NEWEST = 'newest',
  TITLE = 'title',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
}

export class CourseQueryDto {
  @ApiPropertyOptional({ description: 'Search keyword matching title or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter courses by Category UUID' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter courses by Category slug' })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({ enum: DifficultyLevel, description: 'Filter by difficulty level' })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;

  @ApiPropertyOptional({ description: 'Minimum price filter', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Filter only free courses' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({
    enum: CourseSort,
    default: CourseSort.NEWEST,
    description: 'Sort criteria: newest, title, price_asc, price_desc',
  })
  @IsOptional()
  @IsEnum(CourseSort)
  sort?: CourseSort = CourseSort.NEWEST;

  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
