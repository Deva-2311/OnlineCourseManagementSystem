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
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

@Entity('enrollments')
@Unique('UQ_enrollment_student_course', ['studentId', 'courseId'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Index()
  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Course, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Index()
  @Column({ type: 'uuid' })
  courseId: string;

  @Index()
  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  enrolledAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  toSafeEnrollment() {
    return {
      id: this.id,
      studentId: this.studentId,
      courseId: this.courseId,
      status: this.status,
      enrolledAt: this.enrolledAt,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
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
      student: this.student
        ? {
            id: this.student.id,
            fullName: this.student.fullName,
            name: this.student.fullName,
            email: this.student.email,
          }
        : undefined,
    };
  }
}
