import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Quiz } from './quiz.entity';
import { User } from '../../users/entities/user.entity';
import { StudentAnswer } from './student-answer.entity';
import { QuizAttemptStatus } from '../enums/quiz-attempt-status.enum';

@Entity('quiz_attempts')
@Index(['quizId', 'studentId'])
export class QuizAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Quiz, (quiz) => quiz.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @Index()
  @Column({ type: 'uuid' })
  quizId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Index()
  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'integer', default: 1 })
  attemptNumber: number;

  @Index()
  @Column({
    type: 'enum',
    enum: QuizAttemptStatus,
    default: QuizAttemptStatus.IN_PROGRESS,
  })
  status: QuizAttemptStatus;

  @Column({ type: 'timestamp with time zone' })
  startedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  submittedAt?: Date | null;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null && value !== undefined ? Number(value) : 0),
    },
  })
  score: number;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null && value !== undefined ? Number(value) : 0),
    },
  })
  maxScore: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null && value !== undefined ? Number(value) : 0),
    },
  })
  percentage: number;

  @Column({ type: 'boolean', default: false })
  isPassed: boolean;

  @OneToMany(() => StudentAnswer, (ans) => ans.attempt, { cascade: true })
  answers: StudentAnswer[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  toSafeAttempt() {
    return {
      id: this.id,
      quizId: this.quizId,
      studentId: this.studentId,
      attemptNumber: this.attemptNumber,
      status: this.status,
      startedAt: this.startedAt,
      submittedAt: this.submittedAt,
      score: this.score,
      maxScore: this.maxScore,
      percentage: this.percentage,
      isPassed: this.isPassed,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      answers: this.answers ? this.answers.map((a) => a.toSafeAnswer()) : undefined,
    };
  }
}
