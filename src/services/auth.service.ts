import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../modules/supabase/supabase.service';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

const OTP_TTL_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private transporter?: nodemailer.Transporter;
  private jwtSecret: string;
  private isProduction: boolean;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.jwtSecret = this.config.getOrThrow<string>('JWT_SECRET');
    this.isProduction = this.config.get<string>('NODE_ENV') === 'production';

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        auth: { user, pass },
        secure: port === 465,
      });
    }
  }

  private async createOtp() {
    // 6-digit numeric OTP from a cryptographically secure source
    const otp = randomInt(100000, 1000000).toString();
    return {
      otp,
      verification_otp_hash: await bcrypt.hash(otp, 10),
      verification_expires_at: new Date(
        Date.now() + 1000 * 60 * OTP_TTL_MINUTES,
      ).toISOString(),
    };
  }

  private async findUserByEmail(email: string) {
    const { data, error } = await this.supabase.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async register(name: string, email: string, password: string) {
    const existing = await this.findUserByEmail(email);
    if (existing?.is_verified) {
      throw new BadRequestException('Email already registered');
    }

    const { otp, ...otpFields } = await this.createOtp();
    const fields = {
      name,
      password_hash: await bcrypt.hash(password, 10),
      is_verified: false,
      ...otpFields,
    };

    // An unverified account can register again, so a failed email never locks the address.
    const { error } = existing
      ? await this.supabase.supabase
          .from('users')
          .update(fields)
          .eq('id', existing.id)
      : await this.supabase.supabase.from('users').insert({ email, ...fields });
    if (error) throw new BadRequestException(error.message);

    await this.sendOtpEmail(name, email, otp);
    return { ok: true };
  }

  async resendOtp(email: string) {
    const user = await this.findUserByEmail(email);
    // Same response for unknown/verified accounts so this endpoint can't be used to probe emails.
    if (!user || user.is_verified) return { ok: true };

    const { otp, ...otpFields } = await this.createOtp();
    const { error } = await this.supabase.supabase
      .from('users')
      .update(otpFields)
      .eq('id', user.id);
    if (error) throw new BadRequestException(error.message);

    await this.sendOtpEmail(user.name ?? '', email, otp);
    return { ok: true };
  }

  async verify(email: string, otp: string) {
    const user = await this.findUserByEmail(email);
    if (!user) throw new BadRequestException('Invalid email or OTP');
    if (user.is_verified)
      throw new BadRequestException('Account already verified');
    if (!user.verification_otp_hash)
      throw new BadRequestException('No OTP set for this account');
    if (
      !user.verification_expires_at ||
      new Date(user.verification_expires_at) < new Date()
    )
      throw new BadRequestException('OTP expired');

    const match = await bcrypt.compare(otp, user.verification_otp_hash);
    if (!match) throw new BadRequestException('Invalid email or OTP');

    const { error } = await this.supabase.supabase
      .from('users')
      .update({
        is_verified: true,
        verification_otp_hash: null,
        verification_expires_at: null,
      })
      .eq('id', user.id);
    if (error) throw new BadRequestException(error.message);

    return { ok: true };
  }

  async login(email: string, password: string) {
    const user = await this.findUserByEmail(email);
    if (!user?.password_hash)
      throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) throw new UnauthorizedException('Invalid credentials');
    if (!user.is_verified)
      throw new UnauthorizedException('Email not verified');

    const payload = { sub: user.id, email: user.email };
    const token = jwt.sign(payload, this.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: '1h',
    });

    return { access_token: token };
  }

  private async sendOtpEmail(name: string, email: string, otp: string) {
    if (!this.transporter) {
      if (this.isProduction) {
        throw new ServiceUnavailableException(
          'Email delivery is not configured',
        );
      }
      this.logger.warn(`SMTP not configured; OTP for ${email} is ${otp}`);
      return;
    }

    const backend =
      this.config.get<string>('BACKEND_URL') ||
      `http://localhost:${this.config.get<number>('PORT') || 3000}`;
    try {
      await this.transporter.sendMail({
        from:
          this.config.get<string>('SMTP_FROM') ||
          this.config.get<string>('SMTP_USER'),
        to: email,
        subject: 'Your verification code',
        text: `Hello ${name},\nYour verification code is: ${otp}\nIt expires in ${OTP_TTL_MINUTES} minutes. Use this code with POST ${backend}/auth/verify`,
        html: `
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>Email OTP</title>
            </head>
            <body style="margin:0;background:#f3f6fb;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial;">
              <table role="presentation" width="100%" style="height:100%;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table role="presentation" style="background:#fff;max-width:520px;width:92%;border-radius:10px;padding:28px;box-shadow:0 10px 30px rgba(20,30,40,0.06);">
                      <tr>
                        <td style="text-align:center;padding-bottom:8px;">
                          <h1 style="margin:0;font-size:22px;color:#2563eb;">Email OTP</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #e9eef6;margin-top:12px;padding-top:18px;">
                          <p style="margin:0 0 12px;color:#333;font-size:14px;">Dear ${escapeHtml(name)},</p>
                          <p style="margin:0 0 18px;color:#555;font-size:14px;">Your One-Time Password (OTP) is:</p>
                          <div style="text-align:center;margin-bottom:18px;">
                            <span style="display:inline-block;background:#e9f8ec;color:#16a34a;padding:14px 22px;border-radius:8px;font-size:28px;font-weight:600;letter-spacing:4px;">${otp}</span>
                          </div>
                          <p style="margin:0 0 10px;color:#666;font-size:13px;">Please use this OTP to verify your Life Link account. Do not share this code with anyone.</p>
                          <p style="margin:12px 0 0;color:#999;font-size:12px;">This code expires in ${OTP_TTL_MINUTES} minutes.</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:18px;text-align:center;color:#999;font-size:12px;">
                          <p style="margin:0;">Thank you for using Life Link!</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send OTP email to ${email}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new ServiceUnavailableException(
        'Could not send verification email. Try POST /auth/resend-otp.',
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
