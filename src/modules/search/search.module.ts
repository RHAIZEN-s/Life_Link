import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { SearchController } from './search.controller';
import { SearchService } from '../../services/search.service';

@Module({
  imports: [SupabaseModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
