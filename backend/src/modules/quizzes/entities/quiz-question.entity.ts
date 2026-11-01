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
import { QuestionOption } from './question-option.entity';
import { QuestionType } from '../enums/question-type.enum';

@Entity('quiz_questions')
export class QuizQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Quiz, (quiz) => quiz.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @Index()
  @Column({ type: 'uuid' })
  quizId: string;

  @Column({ type: 'text' })
  questionText: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  questionType: QuestionType;

  @Column({ type: 'integer', default: 1 })
  points: number;

  @Index()
  @Column({ type: 'integer', default: 0 })
  displayOrder: number;

  @Column({ type: 'text', nullable: true })
  explanation?: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  skillId?: string | null;

  @ManyToOne('Skill', 'questions', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'skillId' })
  skill?: any;

  @Column({ type: 'varchar', length: 150, nullable: true })
  topic?: string | null;

  @OneToMany(() => QuestionOption, (opt) => opt.question, { cascade: true })
  options: QuestionOption[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  toSafeQuestion(includeAnswerKey = false) {
    return {
      id: this.id,
      quizId: this.quizId,
      questionText: this.questionText,
      questionType: this.questionType,
      points: this.points,
      displayOrder: this.displayOrder,
      skillId: this.skillId,
      skillName: this.skill?.name,
      topic: this.topic,
      explanation: includeAnswerKey ? this.explanation : undefined,
      options: this.options
        ? this.options
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((opt) => opt.toSafeOption(includeAnswerKey))
        : [],
    };
  }
}
