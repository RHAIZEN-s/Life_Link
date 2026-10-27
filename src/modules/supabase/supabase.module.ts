import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [SupabaseService, StorageService],
  exports: [SupabaseService, StorageService],
})
export class SupabaseModule {}
