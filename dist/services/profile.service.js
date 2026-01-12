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
exports.ProfileService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../modules/supabase/supabase.service");
let ProfileService = class ProfileService {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    async upsertInitialProfile(dto) {
        const { email, fullName, dob, gender, bloodGroup, phone, address } = dto;
        const { data: user, error: userError } = await this.supabase.supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .limit(1)
            .single();
        if (userError || !user) {
            throw new common_1.BadRequestException('User not found for this email');
        }
        const payload = {
            user_id: user.id,
            full_name: fullName,
            dob,
            gender,
            blood_group: bloodGroup,
            phone,
            email,
            address,
        };
        const { data, error } = await this.supabase.supabase
            .from('initial_profile_data')
            .upsert(payload, { onConflict: 'user_id' })
            .select()
            .single();
        if (error) {
            throw new common_1.BadRequestException(error.message);
        }
        return { ok: true, profile: data };
    }
    async getInitialProfile(email) {
        const { data: user, error: userError } = await this.supabase.supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .limit(1)
            .single();
        if (userError || !user) {
            throw new common_1.NotFoundException('User not found for this email');
        }
        const { data, error } = await this.supabase.supabase
            .from('initial_profile_data')
            .select('*')
            .eq('user_id', user.id)
            .limit(1)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                throw new common_1.NotFoundException('Profile not found');
            }
            throw new common_1.BadRequestException(error.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('Profile not found');
        }
        return { ok: true, profile: data };
    }
};
exports.ProfileService = ProfileService;
exports.ProfileService = ProfileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], ProfileService);
//# sourceMappingURL=profile.service.js.map