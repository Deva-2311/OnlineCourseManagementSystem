import {
  Controller,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CertificatesService } from '../certificates.service';
import { SafeCertificateDto } from '../dto/certificate-response.dto';
import { RevokeCertificateDto } from '../dto/revoke-certificate.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';

@ApiTags('Admin Certificates')
@Controller('admin/certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminCertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Patch(':certificateId/revoke')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Revoke an issued certificate (Admin only)',
    description:
      'Marks a certificate as REVOKED with an audit timestamp and reason. Invalidates future downloads and public verification checks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Revoked certificate record',
    type: SafeCertificateDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async revokeCertificate(
    @CurrentUser() user: User,
    @Param('certificateId', ParseUUIDPipe) certificateId: string,
    @Body() dto: RevokeCertificateDto,
  ): Promise<SafeCertificateDto> {
    return this.certificatesService.revokeCertificate(
      user.id,
      certificateId,
      dto.reason,
    );
  }
}
