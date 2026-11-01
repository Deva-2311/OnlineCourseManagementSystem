import { IsOptional, IsNumberString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({ enum: ['all', 'unread', 'read'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'unread', 'read'])
  filter?: 'all' | 'unread' | 'read';
}
