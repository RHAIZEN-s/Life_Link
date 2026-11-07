import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { OtpPurpose } from '../../types/database.types';

const SUBJECTS: Record<OtpPurpose, string> = {
  verify_email: 'Verify your Life Link account',
  reset_password: 'Reset your Life Link password',
};

const INTROS: Record<OtpPurpose, string> = {
  verify_email: 'Use this code to verify your Life Link account.',
  reset_password: 'Use this code to reset your Life Link password.',
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: nodemailer.Transporter;
  private readonly from?: string;
  private readonly isProduction: boolean;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = config.get<number>('SMTP_PORT');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.from = config.get<string>('SMTP_FROM') || user;
    this.isProduction = config.get<string>('NODE_ENV') === 'production';

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  async sendOtp(
    to: string,
    name: string,
    code: string,
    purpose: OtpPurpose,
    ttlMinutes: number,
  ) {
    if (!this.transporter) {
      if (this.isProduction) {
        throw new ServiceUnavailableException(
          'Email delivery is not configured',
        );
      }
      this.logger.warn(
        `SMTP not configured; ${purpose} code for ${to} is ${code}`,
      );
      return;
    }

    const safeName = escapeHtml(name || 'there');
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: SUBJECTS[purpose],
        text: `Hello ${name || 'there'},\n\n${INTROS[purpose]}\n\nCode: ${code}\n\nIt expires in ${ttlMinutes} minutes. If you didn't ask for this, you can ignore this email.`,
        html: `<!doctype html>
<html><body style="margin:0;background:#f3f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" style="padding:40px 0;"><tr><td align="center">
<table role="presentation" style="background:#fff;max-width:520px;width:92%;border-radius:12px;padding:28px;">
<tr><td style="text-align:center;padding-bottom:8px;"><h1 style="margin:0;font-size:22px;color:#E63946;">Life Link</h1></td></tr>
<tr><td style="border-top:1px solid #e9eef6;padding-top:18px;">
<p style="margin:0 0 12px;color:#333;font-size:14px;">Hello ${safeName},</p>
<p style="margin:0 0 18px;color:#555;font-size:14px;">${INTROS[purpose]}</p>
<div style="text-align:center;margin-bottom:18px;"><span style="display:inline-block;background:#fdecee;color:#E63946;padding:14px 22px;border-radius:8px;font-size:28px;font-weight:700;letter-spacing:6px;">${code}</span></div>
<p style="margin:0 0 10px;color:#666;font-size:13px;">Never share this code. Life Link staff will never ask for it.</p>
<p style="margin:12px 0 0;color:#999;font-size:12px;">This code expires in ${ttlMinutes} minutes. If you didn't request it, ignore this email.</p>
</td></tr></table></td></tr></table></body></html>`,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send ${purpose} email to ${to}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new ServiceUnavailableException(
        'Could not send the email right now. Please try again.',
      );
    }
  }
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
}
