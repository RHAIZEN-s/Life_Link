import { OnModuleInit } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
export declare class SupabaseService implements OnModuleInit {
    private readonly config;
    private client;
    constructor(config: ConfigService);
    onModuleInit(): void;
    get supabase(): SupabaseClient<any, "public", "public", any, any>;
}
