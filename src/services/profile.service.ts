import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../modules/supabase/supabase.service';
import { InitialProfileDto } from '../modules/profile/dto/initial-profile.dto';
import { GetProfileDto } from '../modules/profile/dto/get-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly supabase: SupabaseService) {}

  async upsertInitialProfile(dto: InitialProfileDto) {
    const { email, fullName, dob, gender, bloodGroup, phone, address } = dto;

    const { data: user, error: userError } = await this.supabase.supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1)
      .single();

    if (userError || !user) {
      throw new BadRequestException('User not found for this email');
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
      throw new BadRequestException(error.message);
    }

    return { ok: true, profile: data };
  }

  async getInitialProfile(email: string) {
    const { data: user, error: userError } = await this.supabase.supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1)
      .single();

    if (userError || !user) {
      throw new NotFoundException('User not found for this email');
    }

    const { data, error } = await this.supabase.supabase
      .from('initial_profile_data')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Profile not found');
      }
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Profile not found');
    }

    return { ok: true, profile: data };
  }
}
