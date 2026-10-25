import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../modules/supabase/supabase.service';
import {
  SearchDonorsDto,
  SearchType,
} from '../modules/search/dto/search-donors.dto';

const MAX_RESULTS = 100;

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
      .select(
        'id, user_id, blood_type, hospital_name, location, units_available, status, created_at',
      )
      .eq('blood_type', bloodType)
      .eq('status', 'available')
      .order('created_at', { ascending: false })
      .limit(MAX_RESULTS);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const contactFor = await this.loadContacts(
      (donors || []).map((donor) => donor.user_id),
    );
    const results = (donors || []).map((donor) => ({
      id: donor.id,
      ...contactFor(donor.user_id),
      bloodType: donor.blood_type,
      hospital: donor.hospital_name,
      location: donor.location,
      unitsAvailable: donor.units_available,
      status: donor.status,
    }));

    return { results, total: results.length };
  }

  private async searchOrganDonors(organType: string) {
    const { data: donors, error } = await this.supabase.supabase
      .from('organ_donors')
      .select(
        'id, user_id, organ_type, hospital_name, location, status, created_at',
      )
      .eq('organ_type', organType)
      .eq('status', 'available')
      .order('created_at', { ascending: false })
      .limit(MAX_RESULTS);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const contactFor = await this.loadContacts(
      (donors || []).map((donor) => donor.user_id),
    );
    const results = (donors || []).map((donor) => ({
      id: donor.id,
      ...contactFor(donor.user_id),
      organType: donor.organ_type,
      hospital: donor.hospital_name,
      location: donor.location,
      status: donor.status,
    }));

    return { results, total: results.length };
  }

  // Loads names and phones for all donors in two queries instead of two per donor.
  private async loadContacts(userIds: string[]) {
    const ids = [...new Set(userIds)];
    if (!ids.length) {
      return () => ({ userName: 'Unknown', phone: 'N/A' });
    }

    const [users, profiles] = await Promise.all([
      this.supabase.supabase.from('users').select('id, name').in('id', ids),
      this.supabase.supabase
        .from('initial_profile_data')
        .select('user_id, phone')
        .in('user_id', ids),
    ]);
    if (users.error) throw new BadRequestException(users.error.message);
    if (profiles.error) throw new BadRequestException(profiles.error.message);

    const names = new Map<string, string | null>(
      users.data.map((user) => [user.id, user.name]),
    );
    const phones = new Map<string, string>(
      profiles.data.map((profile) => [profile.user_id, profile.phone]),
    );

    return (userId: string) => ({
      userName: names.get(userId) || 'Unknown',
      phone: phones.get(userId) || 'N/A',
    });
  }
}
