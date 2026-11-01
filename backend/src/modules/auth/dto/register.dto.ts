import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/enums/user-role.enum';
import { BadRequestException } from '@nestjs/common';

export class RegisterDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters' })
  @Transform(({ value, obj }) => (value || obj?.name || '').trim())
  fullName: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Alternative alias for fullName',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'student@example.com',
    description: 'Unique email address',
  })
  @IsEmail({}, { message: 'Invalid email address format' })
  @Transform(({ value }) => (value ? value.trim().toLowerCase() : value))
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description:
      'Password meeting security criteria (at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()[\]{}|;:,.<>~+=-])[A-Za-z\d@$!%*?&^#()[\]{}|;:,.<>~+=-]{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password: string;

  @ApiPropertyOptional({
    enum: [UserRole.STUDENT, UserRole.INSTRUCTOR],
    default: UserRole.STUDENT,
    description: 'Target role for registration (STUDENT or INSTRUCTOR only. ADMIN role is forbidden)',
  })
  @IsOptional()
  @IsEnum(UserRole, {
    message: 'Role must be either STUDENT or INSTRUCTOR',
  })
  @Transform(({ value }) => {
    if (value === UserRole.ADMIN || value === 'ADMIN') {
      throw new BadRequestException('Role escalation is not permitted. Cannot register as ADMIN.');
    }
    return value;
  })
  role?: UserRole;
}
