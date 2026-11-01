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
import { Lesson } from '../../curriculum/entities/lesson.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuizAttempt } from './quiz-attempt.entity';

@Entity('quizzes')
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @Index()
  @Column({ type: 'uuid' })
  lessonId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  instructions?: string | null;

  @Column({ type: 'integer', nullable: true })
  timeLimitMinutes?: number | null;

  @Column({ type: 'integer', default: 1 })
  maxAttempts: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 70.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null && value !== undefined ? Number(value) : 70.0),
    },
  })
  passingScore: number;

  @Column({ type: 'boolean', default: true })
  isPublished: boolean;

  @OneToMany(() => QuizQuestion, (question) => question.quiz, { cascade: true })
  questions: QuizQuestion[];

  @OneToMany(() => QuizAttempt, (attempt) => attempt.quiz)
  attempts: QuizAttempt[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  toSafeQuiz(includeAnswerKey = false) {
    const questions = this.questions
      ? this.questions
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((q) => q.toSafeQuestion(includeAnswerKey))
      : [];

    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

    return {
      id: this.id,
      lessonId: this.lessonId,
      title: this.title,
      instructions: this.instructions,
      timeLimitMinutes: this.timeLimitMinutes,
      maxAttempts: this.maxAttempts,
      passingScore: this.passingScore,
      isPublished: this.isPublished,
      totalPoints,
      questionsCount: questions.length,
      questions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
