import {
  Controller,
  Post,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
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
@Controller('enrollments/:enrollmentId/certificate')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EnrollmentCertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post()
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Issue course completion certificate for completed enrollment (Student)',
    description:
      'Evaluates curriculum completion, required assessment passing criteria, and verified payment authorization before issuing a verifiable certificate. Idempotent operation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Issued or existing active certificate',
    type: SafeCertificateDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Course or assessments incomplete; ineligible for certificate',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied: Must own enrollment and have verified payment',
  })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async issueCertificate(
    @CurrentUser() user: User,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ): Promise<SafeCertificateDto> {
    return this.certificatesService.issueCertificate(user.id, enrollmentId);
  }
}
