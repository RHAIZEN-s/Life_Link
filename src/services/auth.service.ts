import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../modules/supabase/supabase.service';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;
  private jwtSecret: string;

  constructor(private readonly supabase: SupabaseService, private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.jwtSecret = this.config.get<string>('JWT_SECRET') || 'change-me';

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({ host, port, auth: { user, pass }, secure: port === 465 });
    }
  }

  private generateOtp() {
    // 6-digit numeric OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async register(name: string, email: string, password: string) {
    const { data: existing } = await this.supabase.supabase.from('users').select('*').eq('email', email).limit(1);
    if (existing && existing.length) {
      throw new BadRequestException('Email already registered');
    }

    const hashed = await bcrypt.hash(password, 10);
    const otp = this.generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expires_at = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

    const { data, error } = await this.supabase.supabase
      .from('users')
      .insert({ name, email, password_hash: hashed, is_verified: false, verification_otp_hash: hashedOtp, verification_expires_at: expires_at })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    if (this.transporter) {
      const backend = this.config.get<string>('BACKEND_URL') || `http://localhost:${this.config.get<number>('PORT') || 3000}`;
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM') || this.config.get<string>('SMTP_USER'),
        to: email,
        subject: 'Your verification code',
        text: `Hello ${name},\nYour verification code is: ${otp}\nIt expires in 15 minutes. Use this code with POST ${backend}/auth/verify`,
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
                          <p style="margin:0 0 12px;color:#333;font-size:14px;">Dear ${name},</p>
                          <p style="margin:0 0 18px;color:#555;font-size:14px;">Your One-Time Password (OTP) is:</p>
                          <div style="text-align:center;margin-bottom:18px;">
                            <span style="display:inline-block;background:#e9f8ec;color:#16a34a;padding:14px 22px;border-radius:8px;font-size:28px;font-weight:600;letter-spacing:4px;">${otp}</span>
                          </div>
                          <p style="margin:0 0 10px;color:#666;font-size:13px;">Please use this OTP to complete your login process. Do not share this code with anyone.</p>
                          <p style="margin:12px 0 0;color:#999;font-size:12px;">This code expires in 15 minutes.</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:18px;text-align:center;color:#999;font-size:12px;">
                          <p style="margin:0;">Thank you for using Email OTP!</p>
                          <p style="margin:6px 0 0;"><a href="#" style="color:#888;text-decoration:none;">© Your Company</a></p>
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
    }

    return { ok: true };
  }

  async verify(email: string, otp: string) {
    const { data } = await this.supabase.supabase.from('users').select('*').eq('email', email).limit(1).single();
    if (!data) throw new BadRequestException('Invalid email or OTP');
    if (!data.verification_otp_hash) throw new BadRequestException('No OTP set for this account');
    if (new Date(data.verification_expires_at) < new Date()) throw new BadRequestException('OTP expired');

    const match = await bcrypt.compare(otp, data.verification_otp_hash);
    if (!match) throw new BadRequestException('Invalid OTP');

    const { error } = await this.supabase.supabase
      .from('users')
      .update({ is_verified: true, verification_otp_hash: null, verification_expires_at: null })
      .eq('id', data.id);
    if (error) throw new BadRequestException(error.message);

    return { ok: true };
  }

  async login(email: string, password: string) {
    const { data } = await this.supabase.supabase.from('users').select('*').eq('email', email).limit(1).single();
    if (!data) throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(password, data.password_hash);
    if (!match) throw new UnauthorizedException('Invalid credentials');
    if (!data.is_verified) throw new UnauthorizedException('Email not verified');

    const payload = { sub: data.id, email: data.email };
    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '1h' });

    return { access_token: token };
  }
}
