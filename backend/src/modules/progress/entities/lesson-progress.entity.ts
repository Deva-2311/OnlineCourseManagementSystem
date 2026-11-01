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
import { Lesson } from '../../curriculum/entities/lesson.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { LessonProgressStatus } from '../enums/lesson-progress-status.enum';

@Entity('lesson_progress')
@Unique('UQ_lesson_progress_enrollment_lesson', ['enrollmentId', 'lessonId'])
@Index(['studentId', 'lessonId'])
export class LessonProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Index()
  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @Index()
  @Column({ type: 'uuid' })
  lessonId: string;

  @ManyToOne(() => Enrollment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: Enrollment;

  @Index()
  @Column({ type: 'uuid' })
  enrollmentId: string;

  @Index()
  @Column({
    type: 'enum',
    enum: LessonProgressStatus,
    default: LessonProgressStatus.NOT_STARTED,
  })
  status: LessonProgressStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt?: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt?: Date | null;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  lastAccessedAt: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  toSafeProgress() {
    return {
      id: this.id,
      studentId: this.studentId,
      lessonId: this.lessonId,
      enrollmentId: this.enrollmentId,
      status: this.status,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      lastAccessedAt: this.lastAccessedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
