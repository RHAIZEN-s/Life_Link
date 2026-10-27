import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { unwrap, unwrapOne, assertOk } from '../../common/db';
import type {
  Json,
  NotificationRow,
  NotificationType,
} from '../../types/database.types';

export type NewNotification = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, Json>;
};

const BATCH_SIZE = 500;

@Injectable()
export class NotificationsService {
  constructor(private readonly supabase: SupabaseService) {}

  async notify(notifications: NewNotification[]) {
    for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
      const batch = notifications.slice(i, i + BATCH_SIZE).map((n) => ({
        user_id: n.userId,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data ?? {},
      }));
      unwrap(
        await this.supabase.from('notifications').insert(batch),
        'notifications.notify',
      );
    }
  }

  // Notifies every admin of a hospital (no-op when hospitalId is null).
  async notifyHospitalAdmins(
    hospitalId: string | null,
    notification: Omit<NewNotification, 'userId'>,
    exceptUserId?: string,
  ) {
    if (!hospitalId) return;
    const admins = unwrap(
      await this.supabase
        .from('users')
        .select('id')
        .eq('hospital_id', hospitalId)
        .eq('role', 'hospital_admin')
        .eq('status', 'active'),
      'notifications.hospitalAdmins',
    );
    await this.notify(
      admins
        .filter((a) => a.id !== exceptUserId)
        .map((a) => ({ ...notification, userId: a.id })),
    );
  }

  async list(userId: string, limit: number, offset: number) {
    const [items, unread] = await Promise.all([
      this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      this.unreadCount(userId),
    ]);
    return {
      items: unwrap(items, 'notifications.list').map(toDto),
      unreadCount: unread,
    };
  }

  async unreadCount(userId: string) {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    assertOk(error, 'notifications.unreadCount');
    return count ?? 0;
  }

  async markRead(userId: string, id: string) {
    const row = unwrapOne(
      await this.supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .maybeSingle(),
      'notifications.markRead',
      'Notification not found',
    );
    return toDto(row);
  }

  async markAllRead(userId: string) {
    unwrap(
      await this.supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null),
      'notifications.markAllRead',
    );
    return { ok: true };
  }
}

function toDto(n: NotificationRow) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data,
    read: n.read_at !== null,
    createdAt: n.created_at,
  };
}
