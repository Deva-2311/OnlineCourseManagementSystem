import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { CourseSection } from '../../curriculum/entities/course-section.entity';
import { CourseStatus } from '../enums/course-status.enum';
import { DifficultyLevel } from '../enums/difficulty-level.enum';

@Entity('courses')
export class Course {
  @OneToMany(() => CourseSection, (section) => section.course)
  sections: CourseSection[];

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 300, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  shortDescription?: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @Index()
  @Column({ type: 'uuid' })
  instructorId: string;

  @ManyToOne(() => Category, (category) => category.courses, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Index()
  @Column({ type: 'uuid' })
  categoryId: string;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    default: DifficultyLevel.BEGINNER,
  })
  difficultyLevel: DifficultyLevel;

  @Column({ type: 'integer', default: 0 })
  estimatedDuration: number; // Duration in hours

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null && value !== undefined ? Number(value) : 0),
    },
  })
  price: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  prerequisites: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  learningOutcomes: string[];

  @ManyToMany('Skill', 'courses')
  @JoinTable({
    name: 'course_skills',
    joinColumn: { name: 'courseId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'skillId', referencedColumnName: 'id' },
  })
  skills: any[];

  @Index()
  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  status: CourseStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  publishedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  /**
   * Safe serialization for public discovery: omits internal moderation details
   */
  toPublicCourse() {
    return {
      id: this.id,
      title: this.title,
      slug: this.slug,
      shortDescription: this.shortDescription,
      description: this.description,
      thumbnailUrl: this.thumbnailUrl,
      thumbnail: this.thumbnailUrl, // Frontend alias compatibility
      category: this.category
        ? { id: this.category.id, name: this.category.name, slug: this.category.slug }
        : null,
      instructor: this.instructor
        ? {
            id: this.instructor.id,
            name: this.instructor.fullName,
            fullName: this.instructor.fullName,
          }
        : null,
      instructorName: this.instructor?.fullName || 'Instructor', // Frontend alias compatibility
      difficultyLevel: this.difficultyLevel,
      level: this.difficultyLevel, // Frontend alias compatibility
      estimatedDuration: this.estimatedDuration,
      durationHours: this.estimatedDuration, // Frontend alias compatibility
      price: this.price,
      isFree: Number(this.price) === 0,
      currency: this.currency,
      prerequisites: this.prerequisites || [],
      learningOutcomes: this.learningOutcomes || [],
      skills: this.skills ? this.skills.map((s: any) => ({ id: s.id, name: s.name })) : [],
      status: this.status,
      publishedAt: this.publishedAt,
      createdAt: this.createdAt,
    };
  }
}
