import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

export class SafeEnrollmentCourseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Full Stack Web Development' })
  title: string;

  @ApiProperty({ example: 'full-stack-web-development' })
  slug: string;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/...' })
  thumbnailUrl?: string;

  @ApiProperty({ example: 49.99 })
  price: number;

  @ApiProperty({ example: 'USD' })
  currency: string;
}

export class SafeEnrollmentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  studentId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  courseId: string;

  @ApiProperty({ enum: EnrollmentStatus, example: EnrollmentStatus.ACTIVE })
  status: EnrollmentStatus;

  @ApiPropertyOptional({ example: '2026-10-11T12:00:00.000Z' })
  enrolledAt?: Date | null;

  @ApiPropertyOptional({ example: null })
  completedAt?: Date | null;

  @ApiProperty({ example: '2026-10-11T12:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ type: SafeEnrollmentCourseDto })
  course?: SafeEnrollmentCourseDto;
}

export class EnrollmentActionResponseDto {
  @ApiProperty({ type: SafeEnrollmentDto })
  enrollment: SafeEnrollmentDto;

  @ApiProperty({ example: false })
  requiresPayment: boolean;

  @ApiPropertyOptional({ example: 49.99 })
  amount?: number;

  @ApiPropertyOptional({ example: 'USD' })
  currency?: string;

  @ApiProperty({ example: 'Successfully enrolled in course.' })
  message: string;
}
