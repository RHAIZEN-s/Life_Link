import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { SupabaseService } from '../supabase/supabase.service';
import { unwrap } from '../../common/db';
import type { UserRole, UserRow } from '../../types/database.types';
import type { AuthUser } from './auth.types';

const ISSUER = 'life-link-api';
const AUDIENCE = 'life-link-app';

type AccessClaims = jwt.JwtPayload & {
  email: string;
  role: UserRole;
  hid: string | null;
};

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

// Short-lived JWT access tokens + opaque, rotating refresh tokens.
// Refresh tokens are stored hashed; reusing a rotated token revokes the whole
// family (all of the user's sessions), which limits damage from token theft.
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly secret: string;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlMs: number;

  constructor(
    config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    this.secret = config.getOrThrow<string>('JWT_SECRET');
    this.accessTtlSeconds = config.getOrThrow<number>(
      'ACCESS_TOKEN_TTL_SECONDS',
    );
    this.refreshTtlMs =
      config.getOrThrow<number>('REFRESH_TOKEN_TTL_DAYS') * 24 * 60 * 60 * 1000;
  }

  get accessTokenTtlSeconds() {
    return this.accessTtlSeconds;
  }

  signAccessToken(
    user: Pick<UserRow, 'id' | 'email' | 'role' | 'hospital_id'>,
  ) {
    const claims = {
      email: user.email,
      role: user.role,
      hid: user.hospital_id,
    };
    return jwt.sign(claims, this.secret, {
      algorithm: 'HS256',
      subject: user.id,
      issuer: ISSUER,
      audience: AUDIENCE,
      expiresIn: this.accessTtlSeconds,
    });
  }

  verifyAccessToken(token: string): AuthUser {
    let payload: string | jwt.JwtPayload;
    try {
      payload = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
        issuer: ISSUER,
        audience: AUDIENCE,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const claims = payload as AccessClaims;
    if (
      typeof payload === 'string' ||
      typeof claims.sub !== 'string' ||
      typeof claims.email !== 'string' ||
      typeof claims.role !== 'string'
    ) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return {
      id: claims.sub,
      email: claims.email,
      role: claims.role,
      hospitalId: claims.hid ?? null,
    };
  }

  async issueRefreshToken(userId: string, userAgent?: string) {
    const token = randomBytes(48).toString('base64url');
    const row = unwrap(
      await this.supabase
        .from('refresh_tokens')
        .insert({
          user_id: userId,
          token_hash: hashToken(token),
          expires_at: new Date(Date.now() + this.refreshTtlMs).toISOString(),
          user_agent: userAgent?.slice(0, 255) ?? null,
        })
        .select('id')
        .single(),
      'issueRefreshToken',
    );
    return { token, id: row.id };
  }

  // Consumes a refresh token and returns the owning user id plus a new token.
  async rotateRefreshToken(token: string, userAgent?: string) {
    const existing = unwrap(
      await this.supabase
        .from('refresh_tokens')
        .select('*')
        .eq('token_hash', hashToken(token))
        .maybeSingle(),
      'rotateRefreshToken.find',
    );
    if (!existing) throw new UnauthorizedException('Invalid refresh token');

    if (existing.revoked_at) {
      this.logger.warn(
        `Refresh token reuse detected for user ${existing.user_id}`,
      );
      await this.revokeAllForUser(existing.user_id);
      throw new UnauthorizedException('Session expired, please log in again');
    }
    if (new Date(existing.expires_at) <= new Date()) {
      throw new UnauthorizedException('Session expired, please log in again');
    }

    // Conditional update: only one concurrent caller can consume the token.
    const consumed = unwrap(
      await this.supabase
        .from('refresh_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', existing.id)
        .is('revoked_at', null)
        .select('id'),
      'rotateRefreshToken.consume',
    );
    if (!consumed.length) {
      throw new UnauthorizedException('Session expired, please log in again');
    }

    const next = await this.issueRefreshToken(existing.user_id, userAgent);
    unwrap(
      await this.supabase
        .from('refresh_tokens')
        .update({ replaced_by: next.id })
        .eq('id', existing.id),
      'rotateRefreshToken.link',
    );
    return { userId: existing.user_id, refreshToken: next.token };
  }

  async revokeRefreshToken(token: string) {
    unwrap(
      await this.supabase
        .from('refresh_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token_hash', hashToken(token))
        .is('revoked_at', null),
      'revokeRefreshToken',
    );
  }

  async revokeAllForUser(userId: string) {
    unwrap(
      await this.supabase
        .from('refresh_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('revoked_at', null),
      'revokeAllForUser',
    );
  }
}
