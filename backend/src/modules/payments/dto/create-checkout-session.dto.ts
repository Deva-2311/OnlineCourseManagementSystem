import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'The unique UUID of the published course to purchase',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'courseId must be a valid UUID' })
  @IsNotEmpty({ message: 'courseId is required' })
  courseId: string;
}
