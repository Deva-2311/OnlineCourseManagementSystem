/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { CertificatesController } from './controllers/certificates.controller';
import { EnrollmentCertificatesController } from './controllers/enrollment-certificates.controller';
import { PublicCertificatesController } from './controllers/public-certificates.controller';
import { AdminCertificatesController } from './controllers/admin-certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificateStatus } from './enums/certificate-status.enum';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

describe('CertificatesControllers', () => {
  let certsController: CertificatesController;
  let enrollmentCertController: EnrollmentCertificatesController;
  let publicController: PublicCertificatesController;
  let adminController: AdminCertificatesController;
  let certificatesService: CertificatesService;

  const mockCertificatesService = {
    issueCertificate: jest.fn(),
    getMyCertificates: jest.fn(),
    getCertificateById: jest.fn(),
    downloadCertificatePdf: jest.fn(),
    verifyPublicCertificate: jest.fn(),
    revokeCertificate: jest.fn(),
  };

  const studentUser = {
    id: 'student-uuid',
    email: 'student@example.com',
    role: UserRole.STUDENT,
  } as User;

  const adminUser = {
    id: 'admin-uuid',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  } as User;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        CertificatesController,
        EnrollmentCertificatesController,
        PublicCertificatesController,
        AdminCertificatesController,
      ],
      providers: [
        {
          provide: CertificatesService,
          useValue: mockCertificatesService,
        },
      ],
    }).compile();

    certsController = module.get<CertificatesController>(CertificatesController);
    enrollmentCertController = module.get<EnrollmentCertificatesController>(EnrollmentCertificatesController);
    publicController = module.get<PublicCertificatesController>(PublicCertificatesController);
    adminController = module.get<AdminCertificatesController>(AdminCertificatesController);
    certificatesService = module.get<CertificatesService>(CertificatesService);
  });

  describe('EnrollmentCertificatesController', () => {
    it('issueCertificate should delegate to certificatesService.issueCertificate with user.id', async () => {
      mockCertificatesService.issueCertificate.mockResolvedValue({
        id: 'cert-1',
        certificateNumber: 'OCMS-CERT-123',
        status: CertificateStatus.ACTIVE,
      });

      const res = await enrollmentCertController.issueCertificate(
        studentUser,
        'enr-uuid-1',
      );
      expect(certificatesService.issueCertificate).toHaveBeenCalledWith(
        'student-uuid',
        'enr-uuid-1',
      );
      expect(res.certificateNumber).toBe('OCMS-CERT-123');
    });
  });

  describe('CertificatesController', () => {
    it('getMyCertificates should delegate to certificatesService.getMyCertificates with user.id', async () => {
      mockCertificatesService.getMyCertificates.mockResolvedValue([]);

      const res = await certsController.getMyCertificates(studentUser);
      expect(certificatesService.getMyCertificates).toHaveBeenCalledWith('student-uuid');
      expect(res).toEqual([]);
    });

    it('getCertificate should delegate to certificatesService.getCertificateById', async () => {
      mockCertificatesService.getCertificateById.mockResolvedValue({
        id: 'cert-1',
        certificateNumber: 'OCMS-CERT-123',
      });

      const res = await certsController.getCertificate(studentUser, 'cert-1');
      expect(certificatesService.getCertificateById).toHaveBeenCalledWith(
        'student-uuid',
        UserRole.STUDENT,
        'cert-1',
      );
      expect(res.certificateNumber).toBe('OCMS-CERT-123');
    });

    it('downloadCertificate should stream buffer with attachment headers', async () => {
      const buffer = Buffer.from('PDF_STREAM');
      mockCertificatesService.downloadCertificatePdf.mockResolvedValue({
        buffer,
        filename: 'certificate-OCMS-CERT-123.pdf',
      });

      const mockRes: any = {
        set: jest.fn(),
        end: jest.fn(),
      };

      await certsController.downloadCertificate(studentUser, 'cert-1', mockRes);

      expect(certificatesService.downloadCertificatePdf).toHaveBeenCalledWith(
        'student-uuid',
        UserRole.STUDENT,
        'cert-1',
      );
      expect(mockRes.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="certificate-OCMS-CERT-123.pdf"',
        'Content-Length': buffer.length,
      });
      expect(mockRes.end).toHaveBeenCalledWith(buffer);
    });
  });

  describe('PublicCertificatesController', () => {
    it('verifyCertificate should delegate to certificatesService.verifyPublicCertificate', async () => {
      mockCertificatesService.verifyPublicCertificate.mockResolvedValue({
        isValid: true,
        certificateNumber: 'OCMS-CERT-PUBLIC',
        courseTitle: 'Systems 101',
      });

      const res = await publicController.verifyCertificate('OCMS-CERT-PUBLIC');
      expect(certificatesService.verifyPublicCertificate).toHaveBeenCalledWith('OCMS-CERT-PUBLIC');
      expect(res.isValid).toBe(true);
    });
  });

  describe('AdminCertificatesController', () => {
    it('revokeCertificate should delegate to certificatesService.revokeCertificate with admin user id', async () => {
      mockCertificatesService.revokeCertificate.mockResolvedValue({
        id: 'cert-1',
        status: CertificateStatus.REVOKED,
      });

      const res = await adminController.revokeCertificate(adminUser, 'cert-1', {
        reason: 'Misconduct',
      });
      expect(certificatesService.revokeCertificate).toHaveBeenCalledWith(
        'admin-uuid',
        'cert-1',
        'Misconduct',
      );
      expect(res.status).toBe(CertificateStatus.REVOKED);
    });
  });
});
