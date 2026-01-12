"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../modules/supabase/supabase.service");
let HomeService = class HomeService {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    async getHomeData(email, latitude, longitude, radiusKm = 5) {
        const { data: user, error: userError } = await this.supabase.supabase
            .from('users')
            .select('id, name')
            .eq('email', email)
            .limit(1)
            .single();
        if (userError || !user) {
            throw new common_1.BadRequestException('User not found');
        }
        const { data: profile } = await this.supabase.supabase
            .from('initial_profile_data')
            .select('blood_group')
            .eq('user_id', user.id)
            .limit(1)
            .single();
        const { data: stats } = await this.supabase.supabase
            .from('user_stats')
            .select('donations, points')
            .eq('user_id', user.id)
            .limit(1)
            .single();
        const { data: requests } = await this.supabase.supabase
            .from('blood_requests')
            .select('id, blood_type, hospital, location, units, urgent, created_at')
            .eq('status', 'open')
            .order('created_at', { ascending: false })
            .limit(10);
        const processedRequests = (requests || []).map((req) => ({
            id: req.id,
            bloodType: req.blood_type,
            hospital: req.hospital,
            location: req.location,
            distance: latitude && longitude ? this.calculateDistance(latitude, longitude, 0, 0) : 'N/A',
            timeAgo: this.getTimeAgo(req.created_at),
            units: req.units,
            urgent: req.urgent,
        }));
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
    getTimeAgo(createdAt) {
        const now = new Date();
        const created = new Date(createdAt);
        const diffMs = now.getTime() - created.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1)
            return 'now';
        if (diffMins < 60)
            return `${diffMins} min ago`;
        if (diffHours < 24)
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return `${distance.toFixed(1)} km`;
    }
};
exports.HomeService = HomeService;
exports.HomeService = HomeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], HomeService);
//# sourceMappingURL=home.service.js.map