import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { CertificateStatus } from '../enums/certificate-status.enum';

@Entity('certificates')
@Unique('UQ_certificates_enrollment', ['enrollmentId'])
@Index(['studentId', 'courseId'])
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, unique: true })
  certificateNumber: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Index()
  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Index()
  @Column({ type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Enrollment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: Enrollment;

  @Index()
  @Column({ type: 'uuid' })
  enrollmentId: string;

  @Index()
  @Column({
    type: 'enum',
    enum: CertificateStatus,
    default: CertificateStatus.ACTIVE,
  })
  status: CertificateStatus;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  issuedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  revokedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  revocationReason?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  toSafeCertificate(baseUrl = 'http://localhost:3000') {
    return {
      id: this.id,
      certificateNumber: this.certificateNumber,
      studentId: this.studentId,
      courseId: this.courseId,
      enrollmentId: this.enrollmentId,
      courseTitle: this.course?.title || '',
      recipientName: this.student?.fullName || '',
      status: this.status,
      issuedAt: this.issuedAt,
      revokedAt: this.revokedAt || null,
      revocationReason: this.revocationReason || null,
      verificationUrl: `${baseUrl}/verify/${this.certificateNumber}`,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toPublicVerification() {
    return {
      isValid: this.status === CertificateStatus.ACTIVE,
      status: this.status,
      certificateNumber: this.certificateNumber,
      courseTitle: this.course?.title || '',
      recipientName: this.student?.fullName || '',
      issuedAt: this.issuedAt,
      revokedAt: this.revokedAt || null,
      revocationReason: this.status === CertificateStatus.REVOKED ? this.revocationReason : null,
    };
  }
}
