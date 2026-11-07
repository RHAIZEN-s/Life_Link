import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { TokenService } from './token.service';
import type { SupabaseService } from '../supabase/supabase.service';

const SECRET = 'x'.repeat(40);

function makeService(ttl = 900) {
  const config = new ConfigService({
    JWT_SECRET: SECRET,
    ACCESS_TOKEN_TTL_SECONDS: ttl,
    REFRESH_TOKEN_TTL_DAYS: 30,
  });
  return new TokenService(config, {} as SupabaseService);
}

const user = {
  id: '6f1c2f8e-6d1c-4a43-9a61-1f4f0c1c2b3a',
  email: 'alice@example.com',
  role: 'hospital_admin' as const,
  hospital_id: 'b2a1c3d4-0000-4000-8000-000000000001',
};

describe('TokenService', () => {
  it('round-trips an access token into an AuthUser', () => {
    const service = makeService();
    const token = service.signAccessToken(user);
    expect(service.verifyAccessToken(token)).toEqual({
      id: user.id,
      email: user.email,
      role: 'hospital_admin',
      hospitalId: user.hospital_id,
    });
  });

  it('rejects tokens signed with another secret', () => {
    const forged = jwt.sign(
      { email: user.email, role: 'super_admin', hid: null },
      'y'.repeat(40),
      {
        subject: user.id,
        issuer: 'life-link-api',
        audience: 'life-link-app',
      },
    );
    expect(() => makeService().verifyAccessToken(forged)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects tokens for another audience', () => {
    const token = jwt.sign(
      { email: user.email, role: 'user', hid: null },
      SECRET,
      {
        subject: user.id,
        issuer: 'life-link-api',
        audience: 'someone-else',
      },
    );
    expect(() => makeService().verifyAccessToken(token)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects the "none" algorithm', () => {
    const unsigned = jwt.sign(
      { email: user.email, role: 'user', hid: null },
      '',
      {
        algorithm: 'none',
        subject: user.id,
        issuer: 'life-link-api',
        audience: 'life-link-app',
      },
    );
    expect(() => makeService().verifyAccessToken(unsigned)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects expired tokens', () => {
    const token = jwt.sign(
      { email: user.email, role: 'user', hid: null },
      SECRET,
      {
        subject: user.id,
        issuer: 'life-link-api',
        audience: 'life-link-app',
        expiresIn: -10,
      },
    );
    expect(() => makeService().verifyAccessToken(token)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects tokens missing required claims', () => {
    const token = jwt.sign({ role: 'user' }, SECRET, {
      subject: user.id,
      issuer: 'life-link-api',
      audience: 'life-link-app',
    });
    expect(() => makeService().verifyAccessToken(token)).toThrow(
      UnauthorizedException,
    );
  });
});
