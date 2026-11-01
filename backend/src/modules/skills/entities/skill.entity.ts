import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { QuizQuestion } from '../../quizzes/entities/quiz-question.entity';
import { Lesson } from '../../curriculum/entities/lesson.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 180, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  categoryId?: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category?: Category | null;

  @OneToMany(() => QuizQuestion, (question) => question.skill)
  questions: QuizQuestion[];

  @ManyToMany(() => Lesson, (lesson) => lesson.skills)
  lessons: Lesson[];

  @ManyToMany(() => Course, (course) => course.skills)
  courses: Course[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  toSafeSkill() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      categoryId: this.categoryId,
      categoryName: this.category?.name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
