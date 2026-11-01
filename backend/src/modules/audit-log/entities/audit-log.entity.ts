import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditAction, AuditOutcome, AuditResourceType } from '../enums/audit-action.enum';
import { User } from '../../users/entities/user.entity';

/**
 * AuditLog — immutable record of significant business events.
 * No UPDATE or DELETE operations should be permitted on this table via
 * application endpoints. The table uses CreateDateColumn only (no UpdateDateColumn).
 */
@Entity('audit_logs')
@Index(['actorId', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['resourceType', 'resourceId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The user who performed the action (null for system-initiated events). */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor: User | null;

  /** Snapshot of actor role at the time of the event (not joined at query time). */
  @Column({ type: 'varchar', length: 50, nullable: true })
  actorRole: string | null;

  /** Snapshot of actor email (safe — not a credential). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  actorEmail: string | null;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  action: AuditAction;

  @Column({ type: 'varchar', length: 50, nullable: true })
  resourceType: AuditResourceType | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  resourceId: string | null;

  @Column({ type: 'varchar', length: 50, default: AuditOutcome.SUCCESS })
  outcome: AuditOutcome;

  /**
   * Non-sensitive contextual data (no passwords, tokens, or secrets).
   * Example: { courseId, courseTitle, reason }
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  /** Client IP address for security and forensic analysis. */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  /** User-Agent header for browser / client context. */
  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Index()
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  toSafeAuditLog() {
    return {
      id: this.id,
      actorId: this.actorId,
      actorEmail: this.actorEmail,
      actorRole: this.actorRole,
      action: this.action,
      resourceType: this.resourceType,
      resourceId: this.resourceId,
      outcome: this.outcome,
      metadata: this.metadata,
      ipAddress: this.ipAddress,
      createdAt: this.createdAt,
    };
  }
}
