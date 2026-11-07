import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { GeoPaginationQueryDto } from '../../common/query.dto';
import { ProfileService, toStatsDto } from '../profile/profile.service';
import { RequestsService } from '../requests/requests.service';
import { CampsService } from '../camps/camps.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { AnnouncementsService } from '../announcements/announcements.module';
import { SupabaseService } from '../supabase/supabase.service';
import { unwrapOne } from '../../common/db';

const HOME_ITEMS = 5;
// Nearby requests on the dashboard are limited to this radius when we know
// where the user is.
const NEARBY_RADIUS_KM = 50;

@Injectable()
export class HomeService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly profiles: ProfileService,
    private readonly requests: RequestsService,
    private readonly camps: CampsService,
    private readonly notifications: NotificationsService,
    private readonly appointments: AppointmentsService,
    private readonly announcements: AnnouncementsService,
  ) {}

  async getHome(user: AuthUser, query: GeoPaginationQueryDto) {
    // Fall back to the saved profile location when the device sends none.
    const profile = await this.profiles.getProfileRow(user.id);
    const origin =
      query.lat !== undefined && query.lng !== undefined
        ? { lat: query.lat, lng: query.lng }
        : profile?.latitude != null && profile.longitude != null
          ? { lat: profile.latitude, lng: profile.longitude }
          : {};
    const geo = {
      ...query,
      ...origin,
      radiusKm: query.radiusKm ?? NEARBY_RADIUS_KM,
      limit: HOME_ITEMS,
      offset: 0,
    };
    // Donors see requests they can actually help with.
    const isDonor =
      profile?.registered_as !== 'recipient' && !!profile?.blood_group;

    const [
      account,
      stats,
      nearbyRequests,
      upcomingCamps,
      unread,
      avatarUrl,
      myRequests,
      appointments,
      banners,
    ] = await Promise.all([
      this.supabase
        .from('users')
        .select('name, verification_status, verification_note')
        .eq('id', user.id)
        .maybeSingle(),
      this.profiles.getStats(user.id),
      this.requests.listOpen(user, { ...geo, compatibleOnly: isDonor }),
      this.camps.listUpcoming(user.id, geo),
      this.notifications.unreadCount(user.id),
      this.profiles.avatarUrl(profile?.avatar_path ?? null),
      this.requests.listMine(user.id, {
        status: 'active',
        limit: HOME_ITEMS,
        offset: 0,
      }),
      this.appointments.listMine(user.id, {
        status: 'upcoming',
        limit: 3,
        offset: 0,
      }),
      this.announcements.activeFor(user.id),
    ]);
    const acct = unwrapOne(account, 'home.user');

    return {
      user: {
        name: acct.name,
        bloodGroup: profile?.blood_group ?? null,
        registeredAs: profile?.registered_as ?? 'donor',
        availableToDonate: profile?.available_to_donate ?? false,
        verificationStatus: acct.verification_status,
        verificationNote: acct.verification_note,
        avatarUrl,
        latitude: profile?.latitude ?? null,
        longitude: profile?.longitude ?? null,
      },
      stats: toStatsDto(stats),
      myActiveRequests: myRequests,
      upcomingAppointments: appointments,
      nearbyRequests,
      upcomingCamps,
      announcements: banners,
      unreadNotifications: unread,
    };
  }
}
