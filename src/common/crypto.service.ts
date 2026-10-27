import { Global, Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const PREFIX = 'enc:v1:';

// Field-level encryption (AES-256-GCM) for sensitive free-text health data.
// Ciphertext format: "enc:v1:" + base64(iv[12] | tag[16] | ciphertext).
// Values without the prefix are treated as legacy plaintext, so existing rows
// keep working and are encrypted on their next write.
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    this.key = Buffer.from(
      config.getOrThrow<string>('DATA_ENCRYPTION_KEY'),
      'base64',
    );
    if (this.key.length !== 32) {
      throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes, base64-encoded');
    }
  }

  encrypt(value: string | null | undefined): string | null | undefined {
    if (value === null || value === undefined) return value;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return (
      PREFIX + Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')
    );
  }

  decrypt(value: string | null): string | null {
    if (value === null || !value.startsWith(PREFIX)) return value;
    const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      raw.subarray(0, 12),
    );
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([
      decipher.update(raw.subarray(28)),
      decipher.final(),
    ]).toString('utf8');
  }
}

@Global()
@Module({ providers: [CryptoService], exports: [CryptoService] })
export class CryptoModule {}
