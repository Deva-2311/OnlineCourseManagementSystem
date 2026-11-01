/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction, AuditOutcome, AuditResourceType } from './enums/audit-action.enum';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getRepositoryToken(AuditLog), useValue: repo },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  // ─── log() ──────────────────────────────────────────────────────

  describe('log()', () => {
    it('creates and saves an audit log entry', async () => {
      const entry = { id: 'a1', action: AuditAction.ENROLLMENT_CREATED };
      repo.create.mockReturnValue(entry);
      repo.save.mockResolvedValue(entry);

      await service.log({
        actorId: 'user-1',
        actorEmail: 'u@example.com',
        actorRole: 'STUDENT',
        action: AuditAction.ENROLLMENT_CREATED,
        resourceType: AuditResourceType.ENROLLMENT,
        resourceId: 'enroll-1',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-1',
          action: AuditAction.ENROLLMENT_CREATED,
          outcome: AuditOutcome.SUCCESS,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('does NOT throw when save fails — swallows the error', async () => {
      repo.create.mockReturnValue({});
      repo.save.mockRejectedValue(new Error('DB down'));

      await expect(
        service.log({ action: AuditAction.PAYMENT_FAILED }),
      ).resolves.toBeUndefined();
    });

    it('defaults outcome to SUCCESS when not provided', async () => {
      repo.create.mockReturnValue({});
      repo.save.mockResolvedValue({});

      await service.log({ action: AuditAction.CERTIFICATE_ISSUED });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: AuditOutcome.SUCCESS }),
      );
    });
  });

  // ─── findAll() ──────────────────────────────────────────────────

  describe('findAll()', () => {
    function makeQb(data: unknown[], total: number) {
      return {
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([data, total]),
      };
    }

    it('paginates correctly', async () => {
      const qb = makeQb([], 0);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 2, limit: 10 });
      expect(qb.skip).toHaveBeenCalledWith(10); // (2-1)*10
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
    });

    it('enforces max page size of 100', async () => {
      const qb = makeQb([], 0);
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ limit: 9999 });
      expect(qb.take).toHaveBeenCalledWith(100);
    });

    it('applies actorId filter when provided', async () => {
      const qb = makeQb([], 0);
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ actorId: 'actor-uuid' });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'al.actorId = :actorId',
        { actorId: 'actor-uuid' },
      );
    });

    it('applies date range filters', async () => {
      const qb = makeQb([], 0);
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ from: '2026-01-01', to: '2026-06-30' });

      const calls = qb.andWhere.mock.calls;
      expect(calls.some((c: any[]) => c[0].includes('>= :from'))).toBe(true);
      expect(calls.some((c: any[]) => c[0].includes('<= :to'))).toBe(true);
    });

    it('applies actorEmail and free-text search filters', async () => {
      const qb = makeQb([], 0);
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ actorEmail: 'admin@test.com', search: 'APPROVED' });

      const calls = qb.andWhere.mock.calls;
      expect(calls.some((c: any[]) => c[0].includes('al.actorEmail ILIKE :actorEmail'))).toBe(true);
      expect(calls.some((c: any[]) => c[0].includes(':search'))).toBe(true);
    });

    it('returns correct meta.totalPages', async () => {
      const qb = makeQb([], 95);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ limit: 25 });
      expect(result.meta.totalPages).toBe(4); // ceil(95/25) = 4
    });
  });

  // ─── exportCsv() ────────────────────────────────────────────────

  describe('exportCsv()', () => {
    it('caps export rows at 5000 and applies filters', async () => {
      const qb = {
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.exportCsv({ action: AuditAction.COURSE_APPROVED, search: 'course' });
      expect(qb.take).toHaveBeenCalledWith(5000);
      expect(qb.andWhere).toHaveBeenCalledWith('al.action = :action', { action: AuditAction.COURSE_APPROVED });
    });
  });
});
