/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockSafeUser = {
    id: 'user-1',
    fullName: 'Jane Doe',
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    isEmailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn().mockResolvedValue(mockSafeUser),
            login: jest.fn().mockResolvedValue({
              accessToken: 'access-token',
              refreshToken: 'refresh-token',
              user: mockSafeUser,
            }),
            refresh: jest.fn().mockResolvedValue({
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token',
              user: mockSafeUser,
            }),
            logout: jest.fn().mockResolvedValue({ message: 'Logged out successfully' }),
            getProfile: jest.fn().mockResolvedValue(mockSafeUser),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should delegate register to authService.register', async () => {
    const dto = {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'Password123!',
    };
    const result = await controller.register(dto);

    expect(authService.register).toHaveBeenCalledWith(dto);
    expect(result).toBe(mockSafeUser);
  });

  it('should delegate login to authService.login passing res object', async () => {
    const dto = { email: 'jane@example.com', password: 'Password123!' };
    const res = { cookie: jest.fn() } as any;

    const result = await controller.login(dto, res);

    expect(authService.login).toHaveBeenCalledWith(dto, res);
    expect(result.accessToken).toBe('access-token');
  });

  it('should accept refresh token from cookies', async () => {
    const req = { cookies: { refresh_token: 'cookie-token' } } as any;
    const res = { cookie: jest.fn() } as any;

    const result = await controller.refresh(req, res, {});

    expect(authService.refresh).toHaveBeenCalledWith('cookie-token', res);
    expect(result.accessToken).toBe('new-access-token');
  });

  it('should accept refresh token from body when cookie is not present', async () => {
    const req = { cookies: {} } as any;
    const res = { cookie: jest.fn() } as any;

    const result = await controller.refresh(req, res, { refreshToken: 'body-token' });

    expect(authService.refresh).toHaveBeenCalledWith('body-token', res);
    expect(result.accessToken).toBe('new-access-token');
  });

  it('should reject refresh when neither cookie nor body token is provided', async () => {
    const req = { cookies: {} } as any;
    const res = {} as any;

    await expect(controller.refresh(req, res, {})).rejects.toThrow(UnauthorizedException);
  });

  it('should delegate logout to authService.logout', async () => {
    const user = { id: 'user-1' } as any;
    const res = { clearCookie: jest.fn() } as any;

    const result = await controller.logout(user, res);

    expect(authService.logout).toHaveBeenCalledWith('user-1', res);
    expect(result.message).toContain('Logged out');
  });

  it('should delegate getProfile to authService.getProfile', async () => {
    const user = { id: 'user-1' } as any;

    const result = await controller.getProfile(user);

    expect(authService.getProfile).toHaveBeenCalledWith('user-1');
    expect(result).toBe(mockSafeUser);
  });
});
