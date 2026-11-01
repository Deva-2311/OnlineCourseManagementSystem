import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  HttpStatus,
  HttpCode,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuditLogService } from './audit-log.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { escapeCsvValue } from '../../common/utils/csv.util';

@ApiTags('Admin Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List audit log entries with filters and pagination (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Paginated audit log entries' })
  async findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: AuditLogQueryDto,
  ) {
    return this.auditLogService.findAll(query);
  }

  @Get('export/csv')
  @ApiOperation({
    summary: 'Export audit log as CSV (Admin only, max 5000 rows)',
  })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportCsv(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: AuditLogQueryDto,
    @Res() res: Response,
  ) {
    const rows = await this.auditLogService.exportCsv(query);

    const headers = [
      'ID',
      'Actor Email',
      'Actor Role',
      'Action',
      'Resource Type',
      'Resource ID',
      'Outcome',
      'IP Address',
      'Timestamp (UTC)',
    ];

    const csvLines: string[] = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map((r) =>
        [
          r.id,
          r.actorEmail ?? '',
          r.actorRole ?? '',
          r.action,
          r.resourceType ?? '',
          r.resourceId ?? '',
          r.outcome,
          r.ipAddress ?? '',
          r.createdAt.toISOString(),
        ]
          .map(escapeCsvValue)
          .join(','),
      ),
    ];

    const csv = csvLines.join('\r\n');
    const filename = `ocms-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send('\uFEFF' + csv); // BOM for Excel compatibility
  }
}
