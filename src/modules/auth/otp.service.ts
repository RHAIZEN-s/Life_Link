import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { unwrap } from '../../common/db';
import type { OtpPurpose } from '../../types/database.types';

export const OTP_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

// Six-digit one-time codes, stored as keyed hashes. A code dies after
// MAX_ATTEMPTS wrong guesses, on expiry, or on first successful use.
@Injectable()
export class OtpService {
  private readonly key: string;

  constructor(
    config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    this.key = config.getOrThrow<string>('JWT_SECRET');
  }

  private hash(code: string) {
    return createHmac('sha256', this.key).update(code).digest('hex');
  }

  async issue(userId: string, purpose: OtpPurpose): Promise<string> {
    const active = unwrap(
      await this.supabase
        .from('auth_otps')
        .select('id, created_at')
        .eq('user_id', userId)
        .eq('purpose', purpose)
        .is('consumed_at', null)
        .maybeSingle(),
      'otp.issue.find',
    );
    if (
      active &&
      Date.now() - new Date(active.created_at).getTime() < RESEND_COOLDOWN_MS
    ) {
      throw new HttpException(
        'Please wait a minute before requesting another code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (active) {
      unwrap(
        await this.supabase.from('auth_otps').delete().eq('id', active.id),
        'otp.issue.clear',
      );
    }

    const code = randomInt(100000, 1000000).toString();
    unwrap(
      await this.supabase.from('auth_otps').insert({
        user_id: userId,
        purpose,
        code_hash: this.hash(code),
        expires_at: new Date(
          Date.now() + OTP_TTL_MINUTES * 60 * 1000,
        ).toISOString(),
      }),
      'otp.issue.insert',
    );
    return code;
  }

  async consume(userId: string, purpose: OtpPurpose, code: string) {
    const invalid = new BadRequestException('Invalid or expired code');
    const otp = unwrap(
      await this.supabase
        .from('auth_otps')
        .select('*')
        .eq('user_id', userId)
        .eq('purpose', purpose)
        .is('consumed_at', null)
        .maybeSingle(),
      'otp.consume.find',
    );
    if (
      !otp ||
      otp.attempts >= MAX_ATTEMPTS ||
      new Date(otp.expires_at) <= new Date()
    ) {
      throw invalid;
    }

    const expected = Buffer.from(otp.code_hash, 'hex');
    const actual = Buffer.from(this.hash(code), 'hex');
    if (!timingSafeEqual(expected, actual)) {
      unwrap(
        await this.supabase
          .from('auth_otps')
          .update({ attempts: otp.attempts + 1 })
          .eq('id', otp.id),
        'otp.consume.attempt',
      );
      throw invalid;
    }

    const consumed = unwrap(
      await this.supabase
        .from('auth_otps')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', otp.id)
        .is('consumed_at', null)
        .select('id'),
      'otp.consume.mark',
    );
    if (!consumed.length) throw invalid;
  }
}
