import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RevokeCertificateDto {
  @ApiPropertyOptional({ example: 'Academic integrity violation or administrative correction' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
