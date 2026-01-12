import { SupabaseService } from '../modules/supabase/supabase.service';
import { InitialProfileDto } from '../modules/profile/dto/initial-profile.dto';
export declare class ProfileService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    upsertInitialProfile(dto: InitialProfileDto): Promise<{
        ok: boolean;
        profile: any;
    }>;
    getInitialProfile(email: string): Promise<{
        ok: boolean;
        profile: any;
    }>;
}
