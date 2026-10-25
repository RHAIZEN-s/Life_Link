import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../modules/supabase/supabase.service';

const MAX_REQUESTS = 10;
// Fetch extra rows so radius filtering still leaves enough results.
const REQUEST_CANDIDATES = 100;

@Injectable()
export class HomeService {
  constructor(private readonly supabase: SupabaseService) {}

  async getHomeData(
    userId: string,
    latitude?: number,
    longitude?: number,
    radiusKm: number = 5,
  ) {
    // 1. Get user
    const { data: user, error: userError } = await this.supabase.supabase
      .from('users')
      .select('id, name')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      throw new BadRequestException('User not found');
    }

    // 2-5 are independent, so run them together
    const today = new Date().toISOString().split('T')[0];
    const [
      { data: profile },
      { data: stats },
      { data: requests },
      { data: camps },
    ] = await Promise.all([
      this.supabase.supabase
        .from('initial_profile_data')
        .select('blood_group')
        .eq('user_id', user.id)
        .maybeSingle(),
      this.supabase.supabase
        .from('user_stats')
        .select('donations, points')
        .eq('user_id', user.id)
        .maybeSingle(),
      // select('*') so optional latitude/longitude columns are picked up when present
      this.supabase.supabase
        .from('blood_requests')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(REQUEST_CANDIDATES),
      this.supabase.supabase
        .from('blood_camps')
        .select('id, title, location, camp_date, start_time, end_time')
        .eq('status', 'upcoming')
        .gte('camp_date', today)
        .order('camp_date', { ascending: true })
        .limit(10),
    ]);

    const hasOrigin = latitude != null && longitude != null;
    const processedRequests = (requests || [])
      .map((req) => {
        const reqLat = toFiniteNumber(req.latitude);
        const reqLon = toFiniteNumber(req.longitude);
        const distanceKm =
          hasOrigin && reqLat !== null && reqLon !== null
            ? this.calculateDistanceKm(latitude, longitude, reqLat, reqLon)
            : null;
        return { req, distanceKm };
      })
      // Drop requests known to be outside the radius; requests without coordinates are kept.
      .filter(({ distanceKm }) => distanceKm === null || distanceKm <= radiusKm)
      .slice(0, MAX_REQUESTS)
      .map(({ req, distanceKm }) => ({
        id: req.id,
        bloodType: req.blood_type,
        hospital: req.hospital,
        location: req.location,
        distance: distanceKm === null ? 'N/A' : `${distanceKm.toFixed(1)} km`,
        timeAgo: this.getTimeAgo(req.created_at),
        units: req.units,
        urgent: req.urgent,
      }));

    const processedCamps = (camps || []).map((camp) => ({
      id: camp.id,
      title: camp.title,
      location: camp.location,
      date: camp.camp_date,
      time: `${camp.start_time} - ${camp.end_time}`,
    }));

    return {
      userStats: {
        userName: user.name,
        bloodType: profile?.blood_group || 'N/A',
        donations: stats?.donations || 0,
        points: stats?.points || 0,
      },
      nearbyRequests: processedRequests,
      upcomingCamps: processedCamps,
    };
  }

  private getTimeAgo(createdAt: string): string {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  private calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    // Haversine formula
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
