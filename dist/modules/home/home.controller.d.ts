import { HomeService } from '../../services/home.service';
import { GetHomeDto } from './dto/get-home.dto';
export declare class HomeController {
    private readonly home;
    constructor(home: HomeService);
    getHomeData(dto: GetHomeDto): Promise<{
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
}
