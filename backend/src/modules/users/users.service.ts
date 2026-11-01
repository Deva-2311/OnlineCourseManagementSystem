import {
  Injectable,
  Inject,
  forwardRef,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { UserStatus } from './enums/user-status.enum';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  AuditAction,
  AuditOutcome,
  AuditResourceType,
} from '../audit-log/enums/audit-action.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => AuditLogService))
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    return this.userRepository.findOne({ where: { email: normalizedEmail } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create({
      ...userData,
      email: userData.email?.trim().toLowerCase(),
    });
    return this.userRepository.save(user);
  }

  async updateRefreshToken(userId: string, hashedRefreshToken: string | null): Promise<void> {
    await this.userRepository.update(userId, { hashedRefreshToken });
  }

  async update(userId: string, updateData: Partial<User>): Promise<User> {
    await this.userRepository.update(userId, updateData);
    const updated = await this.findById(userId);
    if (!updated) {
      throw new Error(`User with id ${userId} not found after update`);
    }
    return updated;
  }

  async findAllAdmin(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: any;
    status?: any;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const qb = this.userRepository.createQueryBuilder('user');
    if (query.search) {
      const s = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(user.fullName) LIKE :s OR LOWER(user.email) LIKE :s)', { s });
    }
    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }
    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    qb.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);
    const [users, total] = await qb.getManyAndCount();

    return {
      data: users.map((u) => u.toSafeUser()),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserSummary(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Query associated records for impact evaluation
    const [courseCount, enrollmentCount, paymentCount, certificateCount] = await Promise.all([
      this.dataSource.query('SELECT COUNT(*)::int as count FROM courses WHERE "instructorId" = $1', [userId]).catch(() => [{ count: 0 }]),
      this.dataSource.query('SELECT COUNT(*)::int as count FROM enrollments WHERE "studentId" = $1', [userId]).catch(() => [{ count: 0 }]),
      this.dataSource.query('SELECT COUNT(*)::int as count FROM payments WHERE "studentId" = $1', [userId]).catch(() => [{ count: 0 }]),
      this.dataSource.query('SELECT COUNT(*)::int as count FROM certificates WHERE "studentId" = $1', [userId]).catch(() => [{ count: 0 }]),
    ]);

    return {
      ...user.toSafeUser(),
      stats: {
        coursesCount: courseCount[0]?.count || 0,
        enrollmentsCount: enrollmentCount[0]?.count || 0,
        paymentsCount: paymentCount[0]?.count || 0,
        certificatesCount: certificateCount[0]?.count || 0,
      },
    };
  }

  async updateStatus(
    userId: string,
    newStatus: UserStatus,
    admin?: User,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    if (admin && admin.id === userId && newStatus === UserStatus.SUSPENDED) {
      throw new BadRequestException('Administrators cannot suspend their own account.');
    }

    const targetUser = await this.findById(userId);
    if (!targetUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (targetUser.email === 'admin@ocms.com' && newStatus === UserStatus.SUSPENDED) {
      throw new ForbiddenException('The primary system administrator account cannot be suspended.');
    }

    if (targetUser.status === newStatus) {
      return targetUser.toSafeUser();
    }

    const previousStatus = targetUser.status;
    targetUser.status = newStatus;

    // Invalidate refresh tokens and revoke active sessions on suspension or deactivation
    if (newStatus === UserStatus.SUSPENDED || newStatus === UserStatus.INACTIVE) {
      targetUser.hashedRefreshToken = null;
    }

    const saved = await this.userRepository.save(targetUser);

    if (this.auditLogService) {
      await this.auditLogService.log({
        actorId: admin?.id,
        actorEmail: admin?.email,
        actorRole: admin?.role,
        action: AuditAction.USER_STATUS_CHANGED,
        resourceType: AuditResourceType.USER,
        resourceId: targetUser.id,
        outcome: AuditOutcome.SUCCESS,
        metadata: {
          actionType: newStatus === UserStatus.SUSPENDED ? 'SUSPEND_USER' : 'REACTIVATE_USER',
          targetEmail: targetUser.email,
          targetFullName: targetUser.fullName,
          targetRole: targetUser.role,
          previousStatus,
          newStatus,
        },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    }

    return saved.toSafeUser();
  }

  async deleteUser(
    userId: string,
    admin?: User,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    if (admin && admin.id === userId) {
      throw new BadRequestException('Administrators cannot delete their own account.');
    }

    const targetUser = await this.findById(userId);
    if (!targetUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (
      targetUser.email === 'admin@ocms.com' ||
      (targetUser.role === UserRole.ADMIN && admin && targetUser.id !== admin.id)
    ) {
      throw new ForbiddenException('Protected administrator accounts cannot be deleted.');
    }

    // Inspect relational history
    const [courseCount, enrollmentCount, paymentCount, certificateCount] = await Promise.all([
      this.dataSource.query('SELECT COUNT(*)::int as count FROM courses WHERE "instructorId" = $1', [userId]).catch(() => [{ count: 0 }]),
      this.dataSource.query('SELECT COUNT(*)::int as count FROM enrollments WHERE "studentId" = $1', [userId]).catch(() => [{ count: 0 }]),
      this.dataSource.query('SELECT COUNT(*)::int as count FROM payments WHERE "studentId" = $1', [userId]).catch(() => [{ count: 0 }]),
      this.dataSource.query('SELECT COUNT(*)::int as count FROM certificates WHERE "studentId" = $1', [userId]).catch(() => [{ count: 0 }]),
    ]);

    const numCourses = courseCount[0]?.count || 0;
    const numEnrollments = enrollmentCount[0]?.count || 0;
    const numPayments = paymentCount[0]?.count || 0;
    const numCertificates = certificateCount[0]?.count || 0;

    const hasHistoricalRecords = numCourses > 0 || numEnrollments > 0 || numPayments > 0 || numCertificates > 0;

    let deletionType: 'SOFT_DELETED' | 'PERMANENTLY_DELETED';

    if (hasHistoricalRecords) {
      // Safe deactivation and soft deletion to preserve financial, enrollment, and certificate records
      targetUser.status = UserStatus.INACTIVE;
      targetUser.hashedRefreshToken = null;
      targetUser.passwordHash = 'DEACTIVATED_' + Math.random().toString(36);
      await this.userRepository.save(targetUser);
      deletionType = 'SOFT_DELETED';
    } else {
      // Permanent hard deletion for unlinked accounts
      await this.userRepository.delete(userId);
      deletionType = 'PERMANENTLY_DELETED';
    }

    if (this.auditLogService) {
      await this.auditLogService.log({
        actorId: admin?.id,
        actorEmail: admin?.email,
        actorRole: admin?.role,
        action: AuditAction.USER_DELETED,
        resourceType: AuditResourceType.USER,
        resourceId: targetUser.id,
        outcome: AuditOutcome.SUCCESS,
        metadata: {
          actionType: 'DELETE_USER',
          deletionType,
          targetEmail: targetUser.email,
          targetFullName: targetUser.fullName,
          targetRole: targetUser.role,
          hasHistoricalRecords,
          details: {
            courses: numCourses,
            enrollments: numEnrollments,
            payments: numPayments,
            certificates: numCertificates,
          },
        },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    }

    return {
      success: true,
      message:
        deletionType === 'SOFT_DELETED'
          ? `User ${targetUser.email} was safely deactivated and soft-deleted (retaining academic & financial integrity).`
          : `User ${targetUser.email} was permanently deleted.`,
      userId,
      deletionType,
    };
  }
}

