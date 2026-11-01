import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailPayload } from './email.interfaces';

/**
 * Email transport abstraction.
 *
 * Strategy (evaluated once on module init):
 *   1. If SMTP_HOST + SMTP_USER + SMTP_PASS are all set  → real Nodemailer transport
 *   2. Otherwise                                          → console logger (safe dev/test fallback)
 *
 * EMAIL SAFETY:
 * - Failures to send email are caught and logged but NEVER re-thrown.
 * - This ensures that email failures cannot roll back business transactions
 *   (payments, enrollments, certificates, etc.).
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: any | null = null;
  private fromAddress: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const smtpHost = this.configService.get<string>('email.smtpHost') || process.env.SMTP_HOST;
    const smtpUser = this.configService.get<string>('email.smtpUser') || process.env.SMTP_USER;
    const smtpPass = this.configService.get<string>('email.smtpPass') || process.env.SMTP_PASS;
    this.fromAddress =
      this.configService.get<string>('email.fromAddress') ||
      process.env.EMAIL_FROM ||
      'noreply@ocms.local';

    if (smtpHost && smtpUser && smtpPass) {
      try {
        // Dynamic import so nodemailer is not required in test environments
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodemailer = require('nodemailer');
        const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
        });
        await this.transporter.verify();
        this.logger.log(`Email transport: Nodemailer SMTP (${smtpHost}:${smtpPort})`);
      } catch (err: any) {
        this.logger.warn(
          `Nodemailer SMTP init failed — falling back to console transport. Reason: ${err.message}`,
        );
        this.transporter = null;
      }
    } else {
      this.logger.warn(
        'Email transport: Console logger (set SMTP_HOST, SMTP_USER, SMTP_PASS to enable real email delivery)',
      );
    }
  }

  /**
   * Send an email. Failures are swallowed and logged to preserve business transaction integrity.
   */
  async sendMail(payload: EmailPayload): Promise<void> {
    try {
      if (this.transporter) {
        await this.transporter.sendMail({
          from: this.fromAddress,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        });
        this.logger.log(`Email sent → [${payload.to}] subject="${payload.subject}"`);
      } else {
        // Console logger (development / test mode)
        this.logger.log(
          `[EMAIL MOCK] To: ${payload.to} | Subject: ${payload.subject}\n--- TEXT ---\n${payload.text}\n`,
        );
      }
    } catch (err: any) {
      // NEVER re-throw — email failures must not affect business operations
      this.logger.error(
        `Failed to send email to [${payload.to}] subject="${payload.subject}": ${err.message}`,
        err.stack,
      );
    }
  }

  /** Inject a mock transporter during unit tests */
  setTransporter(transporter: any) {
    this.transporter = transporter;
  }
}
