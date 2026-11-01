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
import { QuizQuestion } from './quiz-question.entity';

@Entity('question_options')
export class QuestionOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => QuizQuestion, (q) => q.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: QuizQuestion;

  @Index()
  @Column({ type: 'uuid' })
  questionId: string;

  @Column({ type: 'text' })
  optionText: string;

  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;

  @Index()
  @Column({ type: 'integer', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  toSafeOption(includeAnswerKey = false) {
    return {
      id: this.id,
      questionId: this.questionId,
      optionText: this.optionText,
      displayOrder: this.displayOrder,
      isCorrect: includeAnswerKey ? this.isCorrect : undefined,
    };
  }
}
