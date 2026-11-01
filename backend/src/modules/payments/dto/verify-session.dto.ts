import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifySessionDto {
  @ApiProperty({
    description: 'Stripe Checkout Session ID to verify and reconcile',
    example: 'cs_test_a19j8s...',
  })
  @IsString({ message: 'sessionId must be a string' })
  @IsNotEmpty({ message: 'sessionId is required' })
  sessionId: string;
}
