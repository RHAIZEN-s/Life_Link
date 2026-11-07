import { ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { StorageService } from '../supabase/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { unwrap, unwrapOne } from '../../common/db';
import { inspectUpload, type UploadedFileLike } from '../../common/files';
import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MIME_TYPES,
  STORAGE_BUCKETS,
} from '../../common/constants';
import type { DocumentRow, DocumentStatus } from '../../types/database.types';
import type { AuthUser } from '../auth/auth.types';
import { ReviewDocumentDto, UploadDocumentDto } from './dto/documents.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  async listMine(userId: string) {
    const rows = unwrap(
      await this.supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      'documents.listMine',
    );
    return rows.map(toDocumentDto);
  }

  async upload(
    userId: string,
    file: UploadedFileLike | undefined,
    dto: UploadDocumentDto,
  ) {
    const { mime, ext } = inspectUpload(
      file,
      DOCUMENT_MIME_TYPES,
      DOCUMENT_MAX_BYTES,
    );
    const path = `${userId}/${randomUUID()}.${ext}`;
    await this.storage.upload(
      STORAGE_BUCKETS.documents,
      path,
      file!.buffer,
      mime,
    );
    try {
      const row = unwrap(
        await this.supabase
          .from('documents')
          .insert({
            user_id: userId,
            name: dto.name,
            doc_type: dto.docType,
            storage_path: path,
            mime_type: mime,
            size_bytes: file!.size,
          })
          .select('*')
          .single(),
        'documents.upload',
      );
      if (dto.docType === 'id_proof') {
        // An ID proof puts the account in the verification queue.
        unwrap(
          await this.supabase
            .from('users')
            .update({ verification_status: 'pending', verification_note: null })
            .eq('id', userId)
            .in('verification_status', ['unverified', 'rejected']),
          'documents.upload.queue',
        );
      }
      return toDocumentDto(row);
    } catch (err) {
      // Don't leave an orphaned file behind if the row insert fails.
      await this.storage.remove(STORAGE_BUCKETS.documents, [path]);
      throw err;
    }
  }

  async remove(userId: string, id: string) {
    const doc = await this.getOwned(userId, id);
    if (doc.status === 'approved') {
      throw new ConflictException('Approved documents cannot be deleted');
    }
    unwrap(
      await this.supabase.from('documents').delete().eq('id', id),
      'documents.remove',
    );
    await this.storage.remove(STORAGE_BUCKETS.documents, [doc.storage_path]);
    return { ok: true };
  }

  async fileUrl(user: AuthUser, id: string) {
    // Owners can open their own files; admins can open any file for review.
    const doc =
      user.role === 'user'
        ? await this.getOwned(user.id, id)
        : await this.getRow(id);
    const url = await this.storage.signedUrl(
      STORAGE_BUCKETS.documents,
      doc.storage_path,
    );
    return { url, mimeType: doc.mime_type };
  }

  // --- Admin review ---

  async listForReview(status: DocumentStatus, limit: number, offset: number) {
    const rows = unwrap(
      await this.supabase
        .from('documents')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: status === 'pending' })
        .range(offset, offset + limit - 1),
      'documents.listForReview',
    );
    const ownerIds = [...new Set(rows.map((r) => r.user_id))];
    const owners = ownerIds.length
      ? unwrap(
          await this.supabase
            .from('users')
            .select('id, name, email')
            .in('id', ownerIds),
          'documents.owners',
        )
      : [];
    const byId = new Map(owners.map((o) => [o.id, o]));
    return rows.map((r) => ({
      ...toDocumentDto(r),
      owner: byId.get(r.user_id) ?? null,
    }));
  }

  async review(admin: AuthUser, id: string, dto: ReviewDocumentDto) {
    const doc = await this.getRow(id);
    const row = unwrap(
      await this.supabase
        .from('documents')
        .update({
          status: dto.status,
          review_note: dto.note ?? null,
          reviewed_by: admin.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single(),
      'documents.review',
    );
    const approved = dto.status === 'approved';
    await this.notifications.notify([
      {
        userId: doc.user_id,
        type: 'document_review',
        title: approved ? 'Document approved' : 'Document needs attention',
        body: approved
          ? `"${doc.name}" was approved.`
          : `"${doc.name}" was rejected${dto.note ? `: ${dto.note}` : '.'}`,
        data: { documentId: id },
      },
    ]);
    return toDocumentDto(row);
  }

  private async getOwned(userId: string, id: string) {
    return unwrapOne(
      await this.supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle(),
      'documents.getOwned',
      'Document not found',
    );
  }

  private async getRow(id: string) {
    return unwrapOne(
      await this.supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .maybeSingle(),
      'documents.get',
      'Document not found',
    );
  }
}

export function toDocumentDto(d: DocumentRow) {
  return {
    id: d.id,
    name: d.name,
    docType: d.doc_type,
    mimeType: d.mime_type,
    sizeBytes: d.size_bytes,
    status: d.status,
    reviewNote: d.review_note,
    reviewedAt: d.reviewed_at,
    createdAt: d.created_at,
  };
}
