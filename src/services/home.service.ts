import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../modules/supabase/supabase.service';

@Injectable()
export class HomeService {
  constructor(private readonly supabase: SupabaseService) {}

  async getHomeData(email: string, latitude?: number, longitude?: number, radiusKm: number = 5) {
    // 1. Get user by email
    const { data: user, error: userError } = await this.supabase.supabase
      .from('users')
      .select('id, name')
      .eq('email', email)
      .limit(1)
      .single();

    if (userError || !user) {
      throw new BadRequestException('User not found');
    }

    // 2. Get user profile (for blood type)
    const { data: profile } = await this.supabase.supabase
      .from('initial_profile_data')
      .select('blood_group')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    // 3. Get user stats
    const { data: stats } = await this.supabase.supabase
      .from('user_stats')
      .select('donations, points')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    // 4. Get nearby blood requests (filter by status='open')
    const { data: requests } = await this.supabase.supabase
      .from('blood_requests')
      .select('id, blood_type, hospital, location, units, urgent, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(10);

    // Add timeAgo and distance (if coords provided)
    const processedRequests = (requests || []).map((req) => ({
      id: req.id,
      bloodType: req.blood_type,
      hospital: req.hospital,
      location: req.location,
      distance: latitude && longitude ? this.calculateDistance(latitude, longitude, 0, 0) : 'N/A', // simplified
      timeAgo: this.getTimeAgo(req.created_at),
      units: req.units,
      urgent: req.urgent,
    }));

    // 5. Get upcoming blood camps (today onwards)
    const today = new Date().toISOString().split('T')[0];
    const { data: camps } = await this.supabase.supabase
      .from('blood_camps')
      .select('id, title, location, camp_date, start_time, end_time')
      .eq('status', 'upcoming')
      .gte('camp_date', today)
      .order('camp_date', { ascending: true })
      .limit(10);

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
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
    // Haversine formula (simplified; use library in production)
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
    const distance = R * c;
    return `${distance.toFixed(1)} km`;
  }
}
