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
import { QuizAttempt } from './quiz-attempt.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuestionOption } from './question-option.entity';

@Entity('student_answers')
export class StudentAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => QuizAttempt, (attempt) => attempt.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attemptId' })
  attempt: QuizAttempt;

  @Index()
  @Column({ type: 'uuid' })
  attemptId: string;

  @ManyToOne(() => QuizQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: QuizQuestion;

  @Index()
  @Column({ type: 'uuid' })
  questionId: string;

  @ManyToOne(() => QuestionOption, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'selectedOptionId' })
  selectedOption?: QuestionOption | null;

  @Column({ type: 'uuid', nullable: true })
  selectedOptionId?: string | null;

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
  awardedPoints: number;

  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  toSafeAnswer() {
    return {
      id: this.id,
      attemptId: this.attemptId,
      questionId: this.questionId,
      selectedOptionId: this.selectedOptionId,
      awardedPoints: this.awardedPoints,
      isCorrect: this.isCorrect,
    };
  }
}
