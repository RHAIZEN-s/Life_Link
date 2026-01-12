export declare class UserStatsDto {
    userName: string;
    bloodType: string;
    donations: number;
    points: number;
}
export declare class BloodRequestDto {
    id: string;
    bloodType: string;
    hospital: string;
    location: string;
    distance?: string;
    timeAgo: string;
    units: number;
    urgent: boolean;
}
export declare class BloodCampDto {
    id: string;
    title: string;
    location: string;
    date: string;
    time: string;
}
export declare class HomeResponseDto {
    userStats: UserStatsDto;
    nearbyRequests: BloodRequestDto[];
    upcomingCamps: BloodCampDto[];
}
