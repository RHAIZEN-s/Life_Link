import { SupabaseService } from '../modules/supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
export declare class AuthService {
    private readonly supabase;
    private readonly config;
    private transporter;
    private jwtSecret;
    constructor(supabase: SupabaseService, config: ConfigService);
    private generateOtp;
    register(name: string, email: string, password: string): Promise<{
        ok: boolean;
    }>;
    verify(email: string, otp: string): Promise<{
        ok: boolean;
    }>;
    login(email: string, password: string): Promise<{
        access_token: any;
    }>;
}
