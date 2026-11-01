import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  studentId: string | null;

  @ManyToOne(() => Course, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  courseId: string | null;

  @ManyToOne(() => Enrollment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: Enrollment;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  enrollmentId: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null && value !== undefined ? Number(value) : 0),
    },
  })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Index()
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  stripeCheckoutSessionId: string | null;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePaymentIntentId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  toSafePayment() {
    return {
      id: this.id,
      amount: this.amount,
      currency: this.currency,
      status: this.status,
      paidAt: this.paidAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      studentId: this.studentId,
      courseId: this.courseId,
      enrollmentId: this.enrollmentId,
      course: this.course
        ? {
            id: this.course.id,
            title: this.course.title,
            slug: this.course.slug,
            thumbnailUrl: this.course.thumbnailUrl,
            price: this.course.price,
            currency: this.course.currency,
          }
        : undefined,
    };
  }
}
