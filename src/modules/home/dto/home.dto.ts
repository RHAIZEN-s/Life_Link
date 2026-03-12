export class UserStatsDto {
  userName: string;
  bloodType: string;
  donations: number;
  points: number;
}

export class BloodRequestDto {
  id: string;
  bloodType: string;
  hospital: string;
  location: string;
  distance?: string;
  timeAgo: string;
  units: number;
  urgent: boolean;
}

export class BloodCampDto {
  id: string;
  title: string;
  location: string;
  date: string;
  time: string;
}

export class HomeResponseDto {
  userStats: UserStatsDto;
  nearbyRequests: BloodRequestDto[];
  upcomingCamps: BloodCampDto[];
}
