import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'student@example.com',
    description: 'Email address of the user',
  })
  @IsEmail({}, { message: 'Invalid email address format' })
  @Transform(({ value }) => (value ? value.trim().toLowerCase() : value))
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Account password',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
