import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/enums/user-role.enum';
import { UserStatus } from '../../users/enums/user-status.enum';

export class SafeUserDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  fullName: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'student@example.com' })
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.STUDENT })
  role: UserRole;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus;

  @ApiProperty({ example: false })
  isEmailVerified: boolean;

  @ApiProperty({ example: '2026-10-11T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-11T12:00:00.000Z' })
  updatedAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Short-lived JWT Access Token' })
  accessToken: string;

  @ApiPropertyOptional({ description: 'JWT Refresh Token (also sent in HTTP-only cookie)' })
  refreshToken?: string;

  @ApiProperty({ type: SafeUserDto })
  user: SafeUserDto;
}
