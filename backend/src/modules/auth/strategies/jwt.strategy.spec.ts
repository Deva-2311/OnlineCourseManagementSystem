import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/enums/user-role.enum';
import { UserStatus } from '../../users/enums/user-status.enum';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: jest.Mocked<UsersService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    usersService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    configService = {
      get: jest.fn().mockReturnValue('test-jwt-secret-key-1234567890'),
    } as unknown as jest.Mocked<ConfigService>;

    strategy = new JwtStrategy(configService, usersService);
  });

  it('should validate and return active user from token payload', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    } as any;
    usersService.findById.mockResolvedValue(mockUser);

    const result = await strategy.validate({
      sub: 'user-123',
      email: 'test@example.com',
      role: 'STUDENT',
    });

    expect(result).toBe(mockUser);
  });

  it('should throw UnauthorizedException if user no longer exists in database', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'deleted-user-id', email: 'deleted@example.com', role: 'STUDENT' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException if user status is suspended or inactive', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user-123',
      email: 'suspended@example.com',
      role: UserRole.STUDENT,
      status: UserStatus.SUSPENDED,
    } as any);

    await expect(
      strategy.validate({ sub: 'user-123', email: 'suspended@example.com', role: 'STUDENT' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw UnauthorizedException if payload is invalid or missing sub', async () => {
    await expect(strategy.validate({} as any)).rejects.toThrow(UnauthorizedException);
  });
});
