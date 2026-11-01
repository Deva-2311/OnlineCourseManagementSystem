import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectCourseDto {
  @ApiProperty({
    example: 'Course lacks comprehensive learning outcomes and the description requires clarification on prerequisites.',
    description: 'Detailed explanation for rejecting the submitted course',
  })
  @IsString()
  @IsNotEmpty({ message: 'A rejection reason is required' })
  @MinLength(10, { message: 'Rejection reason must be at least 10 characters long to provide meaningful feedback' })
  @MaxLength(1000, { message: 'Rejection reason cannot exceed 1000 characters' })
  rejectionReason: string;
}
