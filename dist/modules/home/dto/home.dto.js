"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeResponseDto = exports.BloodCampDto = exports.BloodRequestDto = exports.UserStatsDto = void 0;
class UserStatsDto {
    userName;
    bloodType;
    donations;
    points;
}
exports.UserStatsDto = UserStatsDto;
class BloodRequestDto {
    id;
    bloodType;
    hospital;
    location;
    distance;
    timeAgo;
    units;
    urgent;
}
exports.BloodRequestDto = BloodRequestDto;
class BloodCampDto {
    id;
    title;
    location;
    date;
    time;
}
exports.BloodCampDto = BloodCampDto;
class HomeResponseDto {
    userStats;
    nearbyRequests;
    upcomingCamps;
}
exports.HomeResponseDto = HomeResponseDto;
//# sourceMappingURL=home.dto.js.map