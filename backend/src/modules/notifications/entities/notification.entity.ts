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
import { User } from '../../users/entities/user.entity';
import { NotificationType } from '../enums/notification-type.enum';

@Entity('notifications')
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Recipient user */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Index()
  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  /** Optional deep-link for the frontend */
  @Column({ type: 'varchar', length: 500, nullable: true })
  actionUrl: string | null;

  /** Arbitrary context data (IDs, names, etc.) */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  toSafeNotification() {
    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      title: this.title,
      message: this.message,
      actionUrl: this.actionUrl,
      metadata: this.metadata,
      isRead: this.isRead,
      readAt: this.readAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
