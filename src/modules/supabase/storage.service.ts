import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import {
  SIGNED_URL_TTL_SECONDS,
  STORAGE_BUCKETS,
} from '../../common/constants';

type Bucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

// Thin wrapper over Supabase Storage. Buckets are private; clients only ever
// receive short-lived signed URLs.
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async upload(
    bucket: Bucket,
    path: string,
    body: Buffer,
    contentType: string,
  ) {
    const { error } = await this.supabase.client.storage
      .from(bucket)
      .upload(path, body, { contentType, upsert: false });
    if (error) {
      this.logger.error(`Upload to ${bucket}/${path} failed: ${error.message}`);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  async remove(bucket: Bucket, paths: string[]) {
    if (!paths.length) return;
    const { error } = await this.supabase.client.storage
      .from(bucket)
      .remove(paths);
    // Orphaned files are harmless; log instead of failing the request.
    if (error) {
      this.logger.warn(`Delete from ${bucket} failed: ${error.message}`);
    }
  }

  async signedUrl(
    bucket: Bucket,
    path: string,
    options: { downloadName?: string } = {},
  ): Promise<string | null> {
    const { data, error } = await this.supabase.client.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, {
        download: options.downloadName ?? false,
      });
    if (error) {
      this.logger.warn(`Signing ${bucket}/${path} failed: ${error.message}`);
      return null;
    }
    return data.signedUrl;
  }
}
