import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CertificateStatus } from '../enums/certificate-status.enum';

export class SafeCertificateDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'OCMS-CERT-A1B2C-3D4E5' })
  certificateNumber: string;

  @ApiProperty({ format: 'uuid' })
  studentId: string;

  @ApiProperty({ format: 'uuid' })
  courseId: string;

  @ApiProperty({ format: 'uuid' })
  enrollmentId: string;

  @ApiProperty({ example: 'Advanced Computer Systems Architecture' })
  courseTitle: string;

  @ApiProperty({ example: 'Jane Doe' })
  recipientName: string;

  @ApiProperty({ enum: CertificateStatus, example: CertificateStatus.ACTIVE })
  status: CertificateStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  issuedAt: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  revokedAt?: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  revocationReason?: string | null;

  @ApiProperty({ example: 'http://localhost:3000/verify/OCMS-CERT-A1B2C-3D4E5' })
  verificationUrl: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class PublicCertificateVerificationDto {
  @ApiProperty({ example: true })
  isValid: boolean;

  @ApiProperty({ enum: CertificateStatus, example: CertificateStatus.ACTIVE })
  status: CertificateStatus;

  @ApiProperty({ example: 'OCMS-CERT-A1B2C-3D4E5' })
  certificateNumber: string;

  @ApiProperty({ example: 'Advanced Computer Systems Architecture' })
  courseTitle: string;

  @ApiProperty({ example: 'Jane Doe' })
  recipientName: string;

  @ApiProperty({ type: String, format: 'date-time' })
  issuedAt: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  revokedAt?: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  revocationReason?: string | null;
}
