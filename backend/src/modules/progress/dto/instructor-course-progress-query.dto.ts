import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class InstructorCourseProgressQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class InstructorStudentProgressItemDto {
  @ApiProperty()
  student: {
    id: string;
    email: string;
    fullName: string;
  };

  @ApiProperty({ format: 'uuid' })
  enrollmentId: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  enrolledAt: Date | null;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: 10 })
  totalLessons: number;

  @ApiProperty({ example: 4 })
  completedLessons: number;

  @ApiProperty({ example: 40.0 })
  completionPercentage: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastActivityAt: Date | null;

  @ApiProperty({ example: false })
  isCompleted: boolean;
}

export class InstructorCourseProgressResponseDto {
  @ApiProperty({ type: [InstructorStudentProgressItemDto] })
  data: InstructorStudentProgressItemDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
