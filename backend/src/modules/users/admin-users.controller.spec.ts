/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { UsersService } from './users.service';
import { UserRole } from './enums/user-role.enum';
import { UserStatus } from './enums/user-status.enum';
import { User } from './entities/user.entity';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let usersService: jest.Mocked<Partial<UsersService>>;

  const mockAdmin: User = {
    id: 'admin-uuid-1',
    fullName: 'System Admin',
    email: 'admin@ocms.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  } as User;

  const mockStudent: User = {
    id: 'student-uuid-1',
    fullName: 'Jane Student',
    email: 'jane@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
  } as User;

  const mockReq: any = {
    headers: { 'user-agent': 'Jest-Agent' },
    socket: { remoteAddress: '127.0.0.1' },
  };

  beforeEach(async () => {
    usersService = {
      findAllAdmin: jest.fn(),
      getUserSummary: jest.fn(),
      updateStatus: jest.fn(),
      deleteUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockResult = { data: [mockStudent], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
      (usersService.findAllAdmin as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.findAll(1, 10, 'jane', UserRole.STUDENT, UserStatus.ACTIVE);
      expect(result).toEqual(mockResult);
      expect(usersService.findAllAdmin).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'jane',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      });
    });
  });

  describe('getUserSummary', () => {
    it('should return relational impact summary', async () => {
      const mockSummary = {
        ...mockStudent,
        stats: { coursesCount: 0, enrollmentsCount: 2, paymentsCount: 1, certificatesCount: 0 },
      };
      (usersService.getUserSummary as jest.Mock).mockResolvedValue(mockSummary);

      const result = await controller.getUserSummary('student-uuid-1');
      expect(result).toEqual(mockSummary);
      expect(usersService.getUserSummary).toHaveBeenCalledWith('student-uuid-1');
    });
  });

  describe('updateStatus (Suspend / Reactivate)', () => {
    it('should suspend an active user', async () => {
      const updatedUser = { ...mockStudent, status: UserStatus.SUSPENDED };
      (usersService.updateStatus as jest.Mock).mockResolvedValue(updatedUser);

      const result = await controller.updateStatus(
        'student-uuid-1',
        UserStatus.SUSPENDED,
        mockAdmin,
        mockReq,
      );

      expect(result).toEqual(updatedUser);
      expect(usersService.updateStatus).toHaveBeenCalledWith(
        'student-uuid-1',
        UserStatus.SUSPENDED,
        mockAdmin,
        expect.objectContaining({ userAgent: 'Jest-Agent' }),
      );
    });

    it('should reactivate a suspended user', async () => {
      const reactivatedUser = { ...mockStudent, status: UserStatus.ACTIVE };
      (usersService.updateStatus as jest.Mock).mockResolvedValue(reactivatedUser);

      const result = await controller.updateStatus(
        'student-uuid-1',
        UserStatus.ACTIVE,
        mockAdmin,
        mockReq,
      );

      expect(result).toEqual(reactivatedUser);
      expect(usersService.updateStatus).toHaveBeenCalledWith(
        'student-uuid-1',
        UserStatus.ACTIVE,
        mockAdmin,
        expect.objectContaining({ userAgent: 'Jest-Agent' }),
      );
    });

    it('should throw BadRequestException if administrator attempts self-suspension', async () => {
      (usersService.updateStatus as jest.Mock).mockRejectedValue(
        new BadRequestException('Administrators cannot suspend their own account.'),
      );

      await expect(
        controller.updateStatus(mockAdmin.id, UserStatus.SUSPENDED, mockAdmin, mockReq),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if suspending primary system admin', async () => {
      (usersService.updateStatus as jest.Mock).mockRejectedValue(
        new ForbiddenException('The primary system administrator account cannot be suspended.'),
      );

      await expect(
        controller.updateStatus('admin-uuid-1', UserStatus.SUSPENDED, mockAdmin, mockReq),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteUser', () => {
    it('should permanently delete user with zero historical records', async () => {
      const mockDeleteResponse = {
        success: true,
        message: 'User jane@example.com was permanently deleted.',
        userId: 'student-uuid-1',
        deletionType: 'PERMANENTLY_DELETED',
      };
      (usersService.deleteUser as jest.Mock).mockResolvedValue(mockDeleteResponse);

      const result = await controller.deleteUser('student-uuid-1', mockAdmin, mockReq);
      expect(result).toEqual(mockDeleteResponse);
      expect(usersService.deleteUser).toHaveBeenCalledWith(
        'student-uuid-1',
        mockAdmin,
        expect.objectContaining({ userAgent: 'Jest-Agent' }),
      );
    });

    it('should safely soft-delete user with historical records', async () => {
      const mockSoftDeleteResponse = {
        success: true,
        message: 'User jane@example.com was safely deactivated and soft-deleted.',
        userId: 'student-uuid-1',
        deletionType: 'SOFT_DELETED',
      };
      (usersService.deleteUser as jest.Mock).mockResolvedValue(mockSoftDeleteResponse);

      const result = await controller.deleteUser('student-uuid-1', mockAdmin, mockReq);
      expect(result).toEqual(mockSoftDeleteResponse);
    });

    it('should throw BadRequestException if administrator attempts self-deletion', async () => {
      (usersService.deleteUser as jest.Mock).mockRejectedValue(
        new BadRequestException('Administrators cannot delete their own account.'),
      );

      await expect(
        controller.deleteUser(mockAdmin.id, mockAdmin, mockReq),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if deleting protected administrator', async () => {
      (usersService.deleteUser as jest.Mock).mockRejectedValue(
        new ForbiddenException('Protected administrator accounts cannot be deleted.'),
      );

      await expect(
        controller.deleteUser('admin-uuid-1', mockAdmin, mockReq),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
