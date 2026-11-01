import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { Response } from 'express';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, SafeUserDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  async register(registerDto: RegisterDto): Promise<SafeUserDto> {
    // 1. Defend against role escalation
    if (registerDto.role === UserRole.ADMIN || (registerDto.role as any) === 'ADMIN') {
      throw new BadRequestException('Role escalation is not permitted. Cannot register as ADMIN.');
    }

    const normalizedEmail = registerDto.email.trim().toLowerCase();

    // 2. Prevent duplicate email accounts
    const existing = await this.usersService.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }

    // 3. Hash password using Argon2
    const passwordHash = await this.hashPassword(registerDto.password);

    // 4. Default to STUDENT if not explicitly provided
    const assignedRole = registerDto.role || UserRole.STUDENT;

    // 5. Create user
    const user = await this.usersService.create({
      fullName: registerDto.fullName || registerDto.name || 'Anonymous User',
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      status: UserStatus.ACTIVE,
      isEmailVerified: false, // Email verification service to be integrated in future notification phase
    });

    this.logger.log(`New user registered: [${user.id}] with role: [${user.role}]`);

    return user.toSafeUser();
  }

  async login(loginDto: LoginDto, res?: Response): Promise<AuthResponseDto> {
    const normalizedEmail = loginDto.email.trim().toLowerCase();

    // 1. Fetch user (never reveal if account does not exist)
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // 2. Verify password with Argon2
    const passwordValid = await this.verifyPassword(user.passwordHash, loginDto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // 3. Validate account status
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(`Account is ${user.status.toLowerCase()}. Access denied.`);
    }

    // 4. Issue tokens
    const tokens = await this.generateTokens(user);

    // 5. Hash and persist refresh token for rotation and revocation
    const hashedRefreshToken = await argon2.hash(tokens.refreshToken);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    // 6. Set HTTP-only secure cookie if response object is provided
    if (res) {
      this.setRefreshTokenCookie(res, tokens.refreshToken);
    }

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user.toSafeUser(),
    };
  }

  async refresh(
    refreshToken: string,
    res?: Response,
  ): Promise<{ accessToken: string; refreshToken: string; user: SafeUserDto }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    // 1. Verify refresh token signature and expiration
    const refreshSecret =
      this.configService.get<string>('jwt.refreshSecret') ||
      'dev_jwt_refresh_secret_super_secure_key_987654321';

    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Verify user existence and active status
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User session is invalid or user is not active');
    }

    // 3. Detect reuse of revoked token
    if (!user.hashedRefreshToken) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // 4. Verify persisted hash matches the presented refresh token
    const isTokenMatch = await argon2.verify(user.hashedRefreshToken, refreshToken);
    if (!isTokenMatch) {
      // Possible token theft or replay attempt - revoke immediately!
      await this.usersService.updateRefreshToken(user.id, null);
      if (res) {
        this.clearRefreshTokenCookie(res);
      }
      throw new UnauthorizedException('Compromised or invalid refresh token. Session revoked.');
    }

    // 5. Rotate tokens
    const newTokens = await this.generateTokens(user);
    const newHashedRefreshToken = await argon2.hash(newTokens.refreshToken);
    await this.usersService.updateRefreshToken(user.id, newHashedRefreshToken);

    // 6. Update cookie
    if (res) {
      this.setRefreshTokenCookie(res, newTokens.refreshToken);
    }

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      user: user.toSafeUser(),
    };
  }

  async logout(userId: string, res?: Response): Promise<{ message: string }> {
    // 1. Revoke refresh token in database
    await this.usersService.updateRefreshToken(userId, null);

    // 2. Clear refresh cookie
    if (res) {
      this.clearRefreshTokenCookie(res);
    }

    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string): Promise<SafeUserDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return user.toSafeUser();
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const accessSecret =
      this.configService.get<string>('jwt.accessSecret') ||
      'dev_jwt_access_secret_super_secure_key_123456789';
    const accessExpiration = this.configService.get<string>('jwt.accessExpiration') || '15m';

    const refreshSecret =
      this.configService.get<string>('jwt.refreshSecret') ||
      'dev_jwt_refresh_secret_super_secure_key_987654321';
    const refreshExpiration = this.configService.get<string>('jwt.refreshExpiration') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
        },
        {
          secret: accessSecret,
          expiresIn: accessExpiration as any,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: user.id,
          jti: crypto.randomUUID(),
        },
        {
          secret: refreshSecret,
          expiresIn: refreshExpiration as any,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    const isProduction = this.configService.get<string>('env') === 'production';
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    const isProduction = this.configService.get<string>('env') === 'production';
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });
  }
}
