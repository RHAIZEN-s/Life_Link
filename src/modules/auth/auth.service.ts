import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import { unwrap, unwrapOne } from '../../common/db';
import type {
  RegisteredAs,
  ThemePreference,
  UserRow,
} from '../../types/database.types';
import { TokenService } from './token.service';
import { OTP_TTL_MINUTES, OtpService } from './otp.service';

const BCRYPT_ROUNDS = 12;
// Compared against when the email is unknown so response time doesn't reveal
// whether an account exists.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', BCRYPT_ROUNDS);

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRow['role'];
  hospitalId: string | null;
  profileCompleted: boolean;
  verificationStatus: UserRow['verification_status'];
  verificationNote: string | null;
  registeredAs: RegisteredAs | null;
  themePreference: ThemePreference;
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SessionUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly tokens: TokenService,
    private readonly otps: OtpService,
    private readonly mail: MailService,
  ) {}

  async register(name: string, email: string, password: string) {
    const existing = await this.findByEmail(email);
    if (existing?.is_verified) {
      throw new ConflictException('An account with this email already exists');
    }

    const fields = {
      name,
      password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      is_verified: false,
    };
    // An unverified account can sign up again (e.g. the first email never
    // arrived); it still has to prove ownership of the inbox to log in.
    const user = existing
      ? unwrap(
          await this.supabase
            .from('users')
            .update(fields)
            .eq('id', existing.id)
            .select('*')
            .single(),
          'register.update',
        )
      : unwrap(
          await this.supabase
            .from('users')
            .insert({ email, ...fields })
            .select('*')
            .single(),
          'register.insert',
        );

    await this.sendCode(user, 'verify_email');
    return { ok: true, otpExpiresInMinutes: OTP_TTL_MINUTES };
  }

  async resendVerification(email: string) {
    const user = await this.findByEmail(email);
    // Same response for unknown or verified accounts: no account enumeration.
    if (user && !user.is_verified) await this.sendCode(user, 'verify_email');
    return { ok: true };
  }

  async verifyEmail(email: string, otp: string, userAgent?: string) {
    const user = await this.findByEmail(email);
    if (!user || user.is_verified) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    await this.otps.consume(user.id, 'verify_email', otp);

    const verified = unwrap(
      await this.supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', user.id)
        .select('*')
        .single(),
      'verifyEmail',
    );
    return this.createSession(verified, userAgent);
  }

  async login(email: string, password: string, userAgent?: string) {
    const user = await this.findByEmail(email);
    const valid = await bcrypt.compare(
      password,
      user?.password_hash ?? DUMMY_HASH,
    );
    if (!user || !user.password_hash || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.is_verified) {
      throw new ForbiddenException(
        'Please verify your email before logging in',
      );
    }
    assertActive(user);
    return this.createSession(user, userAgent);
  }

  async refresh(refreshToken: string, userAgent?: string): Promise<Session> {
    const { userId, refreshToken: next } = await this.tokens.rotateRefreshToken(
      refreshToken,
      userAgent,
    );
    const user = await this.getUser(userId);
    if (user.status === 'suspended') {
      await this.tokens.revokeAllForUser(user.id);
      throw new UnauthorizedException('Your account has been suspended');
    }
    return {
      accessToken: this.tokens.signAccessToken(user),
      refreshToken: next,
      expiresIn: this.tokens.accessTokenTtlSeconds,
      user: await this.toSessionUser(user),
    };
  }

  async logout(refreshToken: string) {
    await this.tokens.revokeRefreshToken(refreshToken);
    return { ok: true };
  }

  async forgotPassword(email: string) {
    const user = await this.findByEmail(email);
    if (user?.is_verified) await this.sendCode(user, 'reset_password');
    return { ok: true };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.findByEmail(email);
    if (!user || !user.is_verified) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    await this.otps.consume(user.id, 'reset_password', otp);
    unwrap(
      await this.supabase
        .from('users')
        .update({
          password_hash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
        })
        .eq('id', user.id),
      'resetPassword',
    );
    // Sign out every device after a password change.
    await this.tokens.revokeAllForUser(user.id);
    return { ok: true };
  }

  async me(userId: string) {
    return this.toSessionUser(await this.getUser(userId));
  }

  private async createSession(
    user: UserRow,
    userAgent?: string,
  ): Promise<Session> {
    const { token } = await this.tokens.issueRefreshToken(user.id, userAgent);
    unwrap(
      await this.supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id),
      'createSession.lastLogin',
    );
    return {
      accessToken: this.tokens.signAccessToken(user),
      refreshToken: token,
      expiresIn: this.tokens.accessTokenTtlSeconds,
      user: await this.toSessionUser(user),
    };
  }

  private async toSessionUser(user: UserRow): Promise<SessionUser> {
    const profile = unwrap(
      await this.supabase
        .from('profiles')
        .select('blood_group, dob, phone, registered_as, theme_preference')
        .eq('user_id', user.id)
        .maybeSingle(),
      'toSessionUser.profile',
    );
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hospitalId: user.hospital_id,
      profileCompleted: user.role !== 'user' || isProfileComplete(profile),
      verificationStatus: user.verification_status,
      verificationNote: user.verification_note,
      registeredAs: profile?.registered_as ?? null,
      themePreference: profile?.theme_preference ?? 'system',
    };
  }

  private async sendCode(
    user: UserRow,
    purpose: 'verify_email' | 'reset_password',
  ) {
    const code = await this.otps.issue(user.id, purpose);
    await this.mail.sendOtp(
      user.email,
      user.name ?? '',
      code,
      purpose,
      OTP_TTL_MINUTES,
    );
  }

  private async findByEmail(email: string) {
    return unwrap(
      await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle(),
      'findByEmail',
    );
  }

  private async getUser(id: string) {
    return unwrapOne(
      await this.supabase.from('users').select('*').eq('id', id).maybeSingle(),
      'getUser',
      'Account not found',
    );
  }
}

function assertActive(user: UserRow) {
  if (user.status === 'suspended') {
    throw new ForbiddenException(
      'Your account has been suspended. Contact support@lifelink.app for help.',
    );
  }
}

// Donors need a blood group; recipients only need contact basics.
export function isProfileComplete(
  profile: {
    blood_group: string | null;
    dob: string | null;
    phone: string | null;
    registered_as: RegisteredAs;
  } | null,
) {
  if (!profile?.dob || !profile.phone) return false;
  return profile.registered_as === 'recipient' || Boolean(profile.blood_group);
}
