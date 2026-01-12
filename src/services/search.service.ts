import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../modules/supabase/supabase.service';
import { SearchDonorsDto, SearchType } from '../modules/search/dto/search-donors.dto';

@Injectable()
export class SearchService {
  constructor(private readonly supabase: SupabaseService) {}

  async searchDonors(dto: SearchDonorsDto) {
    if (dto.searchType === SearchType.BLOOD) {
      return this.searchBloodDonors(dto.filterType);
    } else if (dto.searchType === SearchType.ORGAN) {
      return this.searchOrganDonors(dto.filterType);
    }

    throw new BadRequestException('Invalid searchType');
  }

  private async searchBloodDonors(bloodType: string) {
    const { data: donors, error } = await this.supabase.supabase
      .from('blood_donors')
      .select('id, user_id, blood_type, hospital_name, location, units_available, status, created_at')
      .eq('blood_type', bloodType)
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Enrich with user data (name, phone from users and initial_profile_data)
    const enrichedDonors = await Promise.all(
      (donors || []).map(async (donor) => {
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
      })
    );

    return {
      results: enrichedDonors,
      total: enrichedDonors.length,
    };
  }

  private async searchOrganDonors(organType: string) {
    const { data: donors, error } = await this.supabase.supabase
      .from('organ_donors')
      .select('id, user_id, organ_type, hospital_name, location, status, created_at')
      .eq('organ_type', organType)
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Enrich with user data
    const enrichedDonors = await Promise.all(
      (donors || []).map(async (donor) => {
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
      })
    );

    return {
      results: enrichedDonors,
      total: enrichedDonors.length,
    };
  }
}
