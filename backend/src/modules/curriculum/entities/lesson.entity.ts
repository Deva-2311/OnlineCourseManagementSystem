import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  Index,
} from 'typeorm';
import { CourseSection } from './course-section.entity';
import { LessonContentType } from '../enums/lesson-content-type.enum';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CourseSection, (section) => section.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sectionId' })
  section: CourseSection;

  @Index()
  @Column({ type: 'uuid' })
  sectionId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: LessonContentType,
    default: LessonContentType.VIDEO,
  })
  contentType: LessonContentType;

  @Column({ type: 'text', nullable: true })
  textContent?: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  videoUrl?: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  contentUrl?: string | null;

  @Column({ type: 'integer', default: 0 })
  estimatedDuration: number; // in minutes

  @Index()
  @Column({ type: 'integer', default: 0 })
  displayOrder: number;

  @Index()
  @Column({ type: 'boolean', default: false })
  isPreview: boolean;

  @ManyToMany('Skill', 'lessons')
  @JoinTable({
    name: 'lesson_skills',
    joinColumn: { name: 'lessonId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'skillId', referencedColumnName: 'id' },
  })
  skills: any[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  toSafeLesson(hasAccess = false) {
    const isUnlocked = hasAccess || this.isPreview;

    return {
      id: this.id,
      sectionId: this.sectionId,
      title: this.title,
      description: this.description,
      contentType: this.contentType,
      estimatedDuration: this.estimatedDuration,
      durationMinutes: this.estimatedDuration,
      displayOrder: this.displayOrder,
      sequenceOrder: this.displayOrder,
      isPreview: this.isPreview,
      isUnlocked,
      skills: this.skills ? this.skills.map((s) => (typeof s.toSafeSkill === 'function' ? s.toSafeSkill() : { id: s.id, name: s.name })) : [],
      textContent: isUnlocked ? this.textContent : undefined,
      videoUrl: isUnlocked ? this.videoUrl : undefined,
      contentUrl: isUnlocked ? this.contentUrl : undefined,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
