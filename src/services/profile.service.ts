import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../modules/supabase/supabase.service';
import { InitialProfileDto } from '../modules/profile/dto/initial-profile.dto';
import type { AuthUser } from '../modules/auth/jwt-auth.guard';

@Injectable()
export class ProfileService {
  constructor(private readonly supabase: SupabaseService) {}

  async upsertInitialProfile(user: AuthUser, dto: InitialProfileDto) {
    const { fullName, dob, gender, bloodGroup, phone, address } = dto;

    const payload = {
      user_id: user.id,
      full_name: fullName,
      dob,
      gender,
      blood_group: bloodGroup,
      phone,
      email: user.email,
      address,
    };

    const { data, error } = await this.supabase.supabase
      .from('initial_profile_data')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { ok: true, profile: data };
  }

  async getInitialProfile(userId: string) {
    const { data, error } = await this.supabase.supabase
      .from('initial_profile_data')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Profile not found');
    }

    return { ok: true, profile: data };
  }
}
