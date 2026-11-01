import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

export class EnrollmentStatusDto {
  @ApiProperty({
    example: true,
    description: 'Whether the calling student is actively enrolled in the course',
  })
  isEnrolled: boolean;

  @ApiPropertyOptional({
    enum: EnrollmentStatus,
    example: EnrollmentStatus.ACTIVE,
    description: 'Current status of the enrollment, or null if never enrolled',
  })
  status: EnrollmentStatus | null;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique ID of the enrollment record if one exists',
  })
  enrollmentId: string | null;

  @ApiPropertyOptional({
    example: '2026-10-11T12:00:00.000Z',
    description: 'Timestamp when active enrollment occurred',
  })
  enrolledAt: Date | null;
}
