import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { HomeController } from './home.controller';
import { HomeService } from '../../services/home.service';

@Module({
  imports: [SupabaseModule],
  controllers: [HomeController],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {}
