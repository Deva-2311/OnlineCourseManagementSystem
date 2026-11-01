import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CertificatesService } from '../certificates.service';
import { PublicCertificateVerificationDto } from '../dto/certificate-response.dto';

@ApiTags('Public Certificate Verification')
@Controller('certificates/verify')
export class PublicCertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get(':certificateNumber')
  @ApiOperation({
    summary: 'Publicly verify educational certificate validity (No authentication required)',
    description:
      'Returns minimal authoritative verification record containing validity status, certificate number, course title, recipient name, and issue date without exposing personal data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Public certificate verification details',
    type: PublicCertificateVerificationDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate not found or invalid certificate number',
  })
  async verifyCertificate(
    @Param('certificateNumber') certificateNumber: string,
  ): Promise<PublicCertificateVerificationDto> {
    return this.certificatesService.verifyPublicCertificate(certificateNumber);
  }
}
