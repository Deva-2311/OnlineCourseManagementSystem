import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateSkillDto {
  @ApiProperty({ description: 'Name of the skill or topic', example: 'Recursion' })
  @IsString()
  @IsNotEmpty({ message: 'Skill name is required' })
  @MinLength(2, { message: 'Skill name must be at least 2 characters' })
  @MaxLength(150, { message: 'Skill name cannot exceed 150 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the skill competency',
    example: 'Formulating recursive algorithms, defining base cases, and analyzing call stack depth.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Category UUID this skill belongs to',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID v4' })
  categoryId?: string;
}
