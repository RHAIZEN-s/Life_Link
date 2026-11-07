import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { CryptoService } from './crypto.service';

const make = (key = randomBytes(32).toString('base64')) =>
  new CryptoService({
    getOrThrow: () => key,
  } as unknown as ConfigService);

describe('CryptoService', () => {
  it('round-trips text and never stores plaintext', () => {
    const crypto = make();
    const secret = 'Type 2 diabetes, penicillin allergy';
    const stored = crypto.encrypt(secret)!;
    expect(stored.startsWith('enc:v1:')).toBe(true);
    expect(stored).not.toContain('diabetes');
    expect(crypto.decrypt(stored)).toBe(secret);
  });

  it('uses a fresh IV each time', () => {
    const crypto = make();
    expect(crypto.encrypt('same')).not.toBe(crypto.encrypt('same'));
  });

  it('passes through nulls and legacy plaintext', () => {
    const crypto = make();
    expect(crypto.encrypt(null)).toBeNull();
    expect(crypto.decrypt(null)).toBeNull();
    expect(crypto.decrypt('old plain value')).toBe('old plain value');
  });

  it('detects tampering', () => {
    const crypto = make();
    const stored = crypto.encrypt('hello')!;
    const raw = Buffer.from(stored.slice(7), 'base64');
    raw[raw.length - 1] ^= 1;
    expect(() => crypto.decrypt('enc:v1:' + raw.toString('base64'))).toThrow();
  });

  it('rejects keys of the wrong size', () => {
    expect(() => make(Buffer.from('short').toString('base64'))).toThrow();
  });
});
