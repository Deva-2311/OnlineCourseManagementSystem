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
import { Course } from '../../courses/entities/course.entity';
import { Lesson } from './lesson.entity';

@Entity('course_sections')
export class CourseSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Index()
  @Column({ type: 'uuid' })
  courseId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Index()
  @Column({ type: 'integer', default: 0 })
  displayOrder: number;

  @OneToMany(() => Lesson, (lesson) => lesson.section)
  lessons: Lesson[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  toSafeSection(hasAccess = false) {
    return {
      id: this.id,
      courseId: this.courseId,
      title: this.title,
      description: this.description,
      displayOrder: this.displayOrder,
      sequenceOrder: this.displayOrder,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lessons: this.lessons
        ? this.lessons
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((lesson) => lesson.toSafeLesson(hasAccess))
        : [],
    };
  }
}
