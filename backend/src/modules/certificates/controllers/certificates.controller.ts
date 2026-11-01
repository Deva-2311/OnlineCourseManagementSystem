import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CertificatesService } from '../certificates.service';
import { SafeCertificateDto } from '../dto/certificate-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';

@ApiTags('Certificates')
@Controller('certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get all certificates earned by the authenticated student' })
  @ApiResponse({
    status: 200,
    description: 'List of student certificates',
    type: [SafeCertificateDto],
  })
  async getMyCertificates(@CurrentUser() user: User): Promise<SafeCertificateDto[]> {
    return this.certificatesService.getMyCertificates(user.id);
  }

  @Get(':certificateId')
  @ApiOperation({ summary: 'Get certificate details by certificate ID' })
  @ApiResponse({
    status: 200,
    description: 'Certificate record',
    type: SafeCertificateDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied: Cannot view another student’s certificate' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async getCertificate(
    @CurrentUser() user: User,
    @Param('certificateId', ParseUUIDPipe) certificateId: string,
  ): Promise<SafeCertificateDto> {
    return this.certificatesService.getCertificateById(
      user.id,
      user.role,
      certificateId,
    );
  }

  @Get(':certificateId/download')
  @ApiOperation({ summary: 'Download authoritative certificate PDF document' })
  @ApiResponse({
    status: 200,
    description: 'Binary PDF file stream',
    content: { 'application/pdf': {} },
  })
  @ApiResponse({ status: 400, description: 'Cannot download a revoked certificate' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async downloadCertificate(
    @CurrentUser() user: User,
    @Param('certificateId', ParseUUIDPipe) certificateId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } =
      await this.certificatesService.downloadCertificatePdf(
        user.id,
        user.role,
        certificateId,
      );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
