import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, SafeUserDto } from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  @ApiOperation({
    summary: 'Register a new student or instructor account',
    description:
      'Creates a new user with Argon2 password hashing. Role defaults to STUDENT. Public registration for ADMIN is forbidden.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    type: SafeUserDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or role escalation attempted',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'An account with this email address already exists',
  })
  async register(@Body() registerDto: RegisterDto): Promise<SafeUserDto> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user credentials',
    description:
      'Verifies email and password using Argon2. Sets an HTTP-only secure refresh token cookie and returns a short-lived access token.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully authenticated',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid email or password',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Account is inactive or suspended',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.authService.login(loginDto, res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate and issue new access & refresh tokens',
    description:
      'Accepts refresh token from HTTP-only cookie or request body. Enforces token rotation and revocation check.',
  })
  @ApiBody({ type: RefreshTokenDto, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tokens refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid, expired, or revoked refresh token',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: RefreshTokenDto,
  ) {
    const refreshToken = req.cookies?.refresh_token || body?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required via cookie or body');
    }
    return this.authService.refresh(refreshToken, res);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log out current user',
    description: 'Revokes the stored refresh token in the database and clears the refresh cookie.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logged out successfully',
    schema: { example: { message: 'Logged out successfully' } },
  })
  async logout(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logout(user.id, res);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({
    summary: 'Retrieve current authenticated user profile',
    description: 'Derives identity strictly from the verified JWT token.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Safe user profile representation',
    type: SafeUserDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication token missing or invalid',
  })
  async getProfile(@CurrentUser() user: User): Promise<SafeUserDto> {
    return this.authService.getProfile(user.id);
  }
}
