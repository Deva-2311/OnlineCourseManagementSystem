import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction, AuditOutcome, AuditResourceType } from './enums/audit-action.enum';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

export interface CreateAuditLogDto {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: AuditAction;
  resourceType?: AuditResourceType | null;
  resourceId?: string | null;
  outcome?: AuditOutcome;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Fire-and-forget: creates an audit log entry.
   * Failures are swallowed so audit recording never breaks parent transactions.
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      const entry = this.auditLogRepository.create({
        actorId: dto.actorId ?? null,
        actorEmail: dto.actorEmail ?? null,
        actorRole: dto.actorRole ?? null,
        action: dto.action,
        resourceType: dto.resourceType ?? null,
        resourceId: dto.resourceId ?? null,
        outcome: dto.outcome ?? AuditOutcome.SUCCESS,
        metadata: dto.metadata ?? null,
        ipAddress: dto.ipAddress ?? null,
        userAgent: dto.userAgent ?? null,
      });
      await this.auditLogRepository.save(entry);
    } catch (err: any) {
      this.logger.error(
        `Failed to write audit log [${dto.action}] for actor [${dto.actorId ?? 'system'}]: ${err.message}`,
      );
    }
  }

  // ─────────────────────────────────────────
  // ADMIN QUERY
  // ─────────────────────────────────────────

  async findAll(query: AuditLogQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 25));
    const skip = (page - 1) * limit;

    const qb = this.auditLogRepository
      .createQueryBuilder('al')
      .orderBy('al.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.actorId) {
      qb.andWhere('al.actorId = :actorId', { actorId: query.actorId });
    }
    if (query.actorEmail) {
      qb.andWhere('al.actorEmail ILIKE :actorEmail', { actorEmail: `%${query.actorEmail.trim()}%` });
    }
    if (query.search) {
      qb.andWhere(
        '(al.actorEmail ILIKE :search OR al.action ILIKE :search OR CAST(al.resourceId AS TEXT) ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }
    if (query.action) {
      qb.andWhere('al.action = :action', { action: query.action });
    }
    if (query.resourceType) {
      qb.andWhere('al.resourceType = :resourceType', { resourceType: query.resourceType });
    }
    if (query.resourceId) {
      qb.andWhere('al.resourceId = :resourceId', { resourceId: query.resourceId });
    }
    if (query.outcome) {
      qb.andWhere('al.outcome = :outcome', { outcome: query.outcome });
    }
    if (query.from) {
      qb.andWhere('al.createdAt >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setUTCHours(23, 59, 59, 999);
      qb.andWhere('al.createdAt <= :to', { to: toDate });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((e) => e.toSafeAuditLog()),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─────────────────────────────────────────
  // CSV EXPORT (streaming-safe row limit)
  // ─────────────────────────────────────────

  private static readonly CSV_MAX_ROWS = 5000;

  /**
   * Returns raw audit log rows for CSV export (admin only).
   * Capped at 5000 rows. Applies the same filters as findAll().
   */
  async exportCsv(query: AuditLogQueryDto): Promise<AuditLog[]> {
    const qb = this.auditLogRepository
      .createQueryBuilder('al')
      .orderBy('al.createdAt', 'DESC')
      .take(AuditLogService.CSV_MAX_ROWS);

    if (query.actorId) qb.andWhere('al.actorId = :actorId', { actorId: query.actorId });
    if (query.actorEmail) qb.andWhere('al.actorEmail ILIKE :actorEmail', { actorEmail: `%${query.actorEmail.trim()}%` });
    if (query.search) {
      qb.andWhere(
        '(al.actorEmail ILIKE :search OR al.action ILIKE :search OR CAST(al.resourceId AS TEXT) ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }
    if (query.action) qb.andWhere('al.action = :action', { action: query.action });
    if (query.resourceType) qb.andWhere('al.resourceType = :resourceType', { resourceType: query.resourceType });
    if (query.resourceId) qb.andWhere('al.resourceId = :resourceId', { resourceId: query.resourceId });
    if (query.outcome) qb.andWhere('al.outcome = :outcome', { outcome: query.outcome });
    if (query.from) qb.andWhere('al.createdAt >= :from', { from: new Date(query.from) });
    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setUTCHours(23, 59, 59, 999);
      qb.andWhere('al.createdAt <= :to', { to: toDate });
    }

    return qb.getMany();
  }
}
