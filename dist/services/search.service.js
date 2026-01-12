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
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../modules/supabase/supabase.service");
const search_donors_dto_1 = require("../modules/search/dto/search-donors.dto");
let SearchService = class SearchService {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    async searchDonors(dto) {
        if (dto.searchType === search_donors_dto_1.SearchType.BLOOD) {
            return this.searchBloodDonors(dto.filterType);
        }
        else if (dto.searchType === search_donors_dto_1.SearchType.ORGAN) {
            return this.searchOrganDonors(dto.filterType);
        }
        throw new common_1.BadRequestException('Invalid searchType');
    }
    async searchBloodDonors(bloodType) {
        const { data: donors, error } = await this.supabase.supabase
            .from('blood_donors')
            .select('id, user_id, blood_type, hospital_name, location, units_available, status, created_at')
            .eq('blood_type', bloodType)
            .eq('status', 'available')
            .order('created_at', { ascending: false });
        if (error) {
            throw new common_1.BadRequestException(error.message);
        }
        const enrichedDonors = await Promise.all((donors || []).map(async (donor) => {
            const { data: user } = await this.supabase.supabase
                .from('users')
                .select('name')
                .eq('id', donor.user_id)
                .limit(1)
                .single();
            const { data: profile } = await this.supabase.supabase
                .from('initial_profile_data')
                .select('phone')
                .eq('user_id', donor.user_id)
                .limit(1)
                .single();
            return {
                id: donor.id,
                userName: user?.name || 'Unknown',
                bloodType: donor.blood_type,
                hospital: donor.hospital_name,
                location: donor.location,
                unitsAvailable: donor.units_available,
                status: donor.status,
                phone: profile?.phone || 'N/A',
            };
        }));
        return {
            results: enrichedDonors,
            total: enrichedDonors.length,
        };
    }
    async searchOrganDonors(organType) {
        const { data: donors, error } = await this.supabase.supabase
            .from('organ_donors')
            .select('id, user_id, organ_type, hospital_name, location, status, created_at')
            .eq('organ_type', organType)
            .eq('status', 'available')
            .order('created_at', { ascending: false });
        if (error) {
            throw new common_1.BadRequestException(error.message);
        }
        const enrichedDonors = await Promise.all((donors || []).map(async (donor) => {
            const { data: user } = await this.supabase.supabase
                .from('users')
                .select('name')
                .eq('id', donor.user_id)
                .limit(1)
                .single();
            const { data: profile } = await this.supabase.supabase
                .from('initial_profile_data')
                .select('phone')
                .eq('user_id', donor.user_id)
                .limit(1)
                .single();
            return {
                id: donor.id,
                userName: user?.name || 'Unknown',
                organType: donor.organ_type,
                hospital: donor.hospital_name,
                location: donor.location,
                status: donor.status,
                phone: profile?.phone || 'N/A',
            };
        }));
        return {
            results: enrichedDonors,
            total: enrichedDonors.length,
        };
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], SearchService);
//# sourceMappingURL=search.service.js.map