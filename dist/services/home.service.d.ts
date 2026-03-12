import { SupabaseService } from '../modules/supabase/supabase.service';
export declare class HomeService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    getHomeData(email: string, latitude?: number, longitude?: number, radiusKm?: number): Promise<{
        userStats: {
            userName: any;
            bloodType: any;
            donations: any;
            points: any;
        };
        nearbyRequests: {
            id: any;
            bloodType: any;
            hospital: any;
            location: any;
            distance: string;
            timeAgo: string;
            units: any;
            urgent: any;
        }[];
        upcomingCamps: {
            id: any;
            title: any;
            location: any;
            date: any;
            time: string;
        }[];
    }>;
    private getTimeAgo;
    private calculateDistance;
}
