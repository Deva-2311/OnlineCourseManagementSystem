import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction, AuditOutcome, AuditResourceType } from '../enums/audit-action.enum';

export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: 'Filter by actor user UUID' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Filter by actor email (partial match)' })
  @IsOptional()
  @IsString()
  actorEmail?: string;

  @ApiPropertyOptional({ description: 'Free-text search across actor email, action, and resource ID' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: AuditAction, description: 'Filter by action type' })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({ enum: AuditResourceType, description: 'Filter by resource type' })
  @IsOptional()
  @IsEnum(AuditResourceType)
  resourceType?: AuditResourceType;

  @ApiPropertyOptional({ description: 'Filter by resource UUID' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ enum: AuditOutcome, description: 'Filter by outcome' })
  @IsOptional()
  @IsEnum(AuditOutcome)
  outcome?: AuditOutcome;

  @ApiPropertyOptional({ description: 'ISO date string — start of range (inclusive)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date string — end of range (inclusive)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Page number (1-indexed)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (max 100)', default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}
