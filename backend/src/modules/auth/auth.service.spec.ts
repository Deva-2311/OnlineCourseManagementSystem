/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: User = {
    id: 'user-uuid-1234',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    isEmailVerified: false,
    hashedRefreshToken: '$argon2id$v=19$m=65536,t=3,p=4$dummyrefreshhash',
    createdAt: new Date(),
    updatedAt: new Date(),
    toSafeUser() {
      return {
        id: this.id,
        fullName: this.fullName,
        name: this.fullName,
        email: this.email,
        role: this.role,
        status: this.status,
        isEmailVerified: this.isEmailVerified,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('signed-jwt-token'),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'jwt.accessSecret') return 'test_access_secret_key_1234567890';
              if (key === 'jwt.refreshSecret') return 'test_refresh_secret_key_1234567890';
              if (key === 'jwt.accessExpiration') return '15m';
              if (key === 'jwt.refreshExpiration') return '7d';
              if (key === 'env') return 'test';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a student with hashed password and normalized email', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation(async (data) => ({
        ...mockUser,
        ...data,
      } as User));

      const result = await service.register({
        fullName: 'Jane Doe',
        email: 'JANE@EXAMPLE.COM',
        password: 'ValidPassword123!',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith('jane@example.com');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'jane@example.com',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        }),
      );
      expect(result.email).toBe('jane@example.com');
      expect(result.role).toBe(UserRole.STUDENT);
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should reject duplicate email registration with ConflictException', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          password: 'ValidPassword123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject attempts to assign ADMIN role through public registration', async () => {
      await expect(
        service.register({
          fullName: 'Malicious User',
          email: 'malicious@example.com',
          password: 'ValidPassword123!',
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should successfully authenticate and return token pair and safe profile', async () => {
      const realPassword = 'MySecretPassword123!';
      const realHash = await argon2.hash(realPassword);
      const activeUser = { ...mockUser, passwordHash: realHash };

      usersService.findByEmail.mockResolvedValue(activeUser as User);

      const resMock = { cookie: jest.fn() } as any;
      const result = await service.login(
        { email: 'jane@example.com', password: realPassword },
        resMock,
      );

      expect(result.accessToken).toBe('signed-jwt-token');
      expect(result.user.email).toBe('jane@example.com');
      expect(usersService.updateRefreshToken).toHaveBeenCalled();
      expect(resMock.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'signed-jwt-token',
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('should reject unknown account with UnauthorizedException without revealing account existence', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject incorrect password with UnauthorizedException', async () => {
      const realHash = await argon2.hash('CorrectPassword123!');
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: realHash,
      } as User);

      await expect(
        service.login({ email: 'jane@example.com', password: 'WrongPassword123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login for disabled/suspended accounts with ForbiddenException', async () => {
      const realPassword = 'Password123!';
      const realHash = await argon2.hash(realPassword);
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
        passwordHash: realHash,
      } as User);

      await expect(
        service.login({ email: 'jane@example.com', password: realPassword }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refresh token & rotation', () => {
    it('should rotate tokens and update persisted hash on valid refresh token', async () => {
      const refreshToken = 'raw-refresh-token';
      const storedHash = await argon2.hash(refreshToken);

      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id });
      usersService.findById.mockResolvedValue({
        ...mockUser,
        hashedRefreshToken: storedHash,
      } as User);

      const resMock = { cookie: jest.fn() } as any;
      const result = await service.refresh(refreshToken, resMock);

      expect(result.accessToken).toBe('signed-jwt-token');
      expect(usersService.updateRefreshToken).toHaveBeenCalled();
      expect(resMock.cookie).toHaveBeenCalled();
    });

    it('should reject revoked refresh token with UnauthorizedException', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id });
      usersService.findById.mockResolvedValue({
        ...mockUser,
        hashedRefreshToken: null, // Revoked session
      } as User);

      await expect(service.refresh('any-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should detect reuse/mismatch of refresh token, revoke session, and reject', async () => {
      const storedHash = await argon2.hash('valid-token');
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id });
      usersService.findById.mockResolvedValue({
        ...mockUser,
        hashedRefreshToken: storedHash,
      } as User);

      await expect(service.refresh('different-stolen-token')).rejects.toThrow(
        UnauthorizedException,
      );
      // Confirms session revocation on breach attempt
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(mockUser.id, null);
    });
  });

  describe('logout', () => {
    it('should invalidate refresh token in database and clear refresh cookie', async () => {
      const resMock = { clearCookie: jest.fn() } as any;
      const result = await service.logout(mockUser.id, resMock);

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(mockUser.id, null);
      expect(resMock.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
      expect(result.message).toContain('Logged out');
    });
  });

  describe('getProfile', () => {
    it('should return safe user profile for authenticated user ID', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const profile = await service.getProfile(mockUser.id);
      expect(profile.id).toBe(mockUser.id);
      expect(profile.email).toBe(mockUser.email);
      expect((profile as any).passwordHash).toBeUndefined();
      expect((profile as any).hashedRefreshToken).toBeUndefined();
    });
  });
});
