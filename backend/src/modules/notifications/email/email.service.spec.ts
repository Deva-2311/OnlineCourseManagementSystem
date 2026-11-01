/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  const baseConfig = {
    'email.smtpHost': '',
    'email.smtpUser': '',
    'email.smtpPass': '',
    'email.fromAddress': 'noreply@ocms.test',
  };

  function buildModule(cfg: Record<string, string> = baseConfig) {
    return Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => cfg[key] ?? ''),
          },
        },
      ],
    }).compile();
  }

  // ─────────────────────────────────────────────────────────────────
  // Console transport (no SMTP credentials)
  // ─────────────────────────────────────────────────────────────────

  describe('console transport (no SMTP credentials)', () => {
    beforeEach(async () => {
      const module: TestingModule = await buildModule();
      service = module.get<EmailService>(EmailService);
      await service.onModuleInit(); // triggers transport selection
    });

    it('should resolve without throwing when sending', async () => {
      await expect(
        service.sendMail({
          to: 'student@example.com',
          subject: 'Welcome!',
          html: '<p>Hi</p>',
          text: 'Hi',
        }),
      ).resolves.toBeUndefined();
    });

    it('does NOT throw if console logger itself throws', async () => {
      // Override the logger to throw — sendMail must still resolve
      jest.spyOn(service['logger'], 'log').mockImplementation(() => {
        throw new Error('Logger blew up');
      });

      await expect(
        service.sendMail({
          to: 'x@y.com',
          subject: 'Test',
          html: '<p>test</p>',
          text: 'test',
        }),
      ).resolves.toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // SMTP transport (mocked nodemailer transporter)
  // ─────────────────────────────────────────────────────────────────

  describe('SMTP transport (injected mock transporter)', () => {
    let mockTransporter: { sendMail: jest.Mock; verify: jest.Mock };

    beforeEach(async () => {
      const module: TestingModule = await buildModule();
      service = module.get<EmailService>(EmailService);
      await service.onModuleInit();

      mockTransporter = {
        verify: jest.fn().mockResolvedValue(true),
        sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-id' }),
      };
      service.setTransporter(mockTransporter);
    });

    it('calls transporter.sendMail with correct arguments', async () => {
      await service.sendMail({
        to: 'student@example.com',
        subject: 'You are enrolled!',
        html: '<p>Congrats</p>',
        text: 'Congrats',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'student@example.com',
          subject: 'You are enrolled!',
        }),
      );
    });

    it('does NOT throw when transporter.sendMail rejects', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP connection refused'));

      await expect(
        service.sendMail({
          to: 'fail@example.com',
          subject: 'Test',
          html: '<p>x</p>',
          text: 'x',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
