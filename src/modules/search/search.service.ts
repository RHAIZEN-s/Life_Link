import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { unwrap } from '../../common/db';
import { geoArgs, roundKm } from '../../common/query.dto';
import type { DonorSearchRow } from '../../types/database.types';
import { SearchDonorsQueryDto } from './search.dto';

@Injectable()
export class SearchService {
  constructor(private readonly supabase: SupabaseService) {}

  async searchDonors(viewerId: string, query: SearchDonorsQueryDto) {
    const rows = unwrap(
      await this.supabase.client.rpc('search_donors', {
        p_viewer: viewerId,
        p_kind: query.type,
        p_blood_group:
          query.type === 'blood' ? (query.bloodGroup ?? null) : null,
        p_organ_type: query.type === 'organ' ? (query.organType ?? null) : null,
        p_compatible: query.type === 'blood' && (query.compatible ?? true),
        ...geoArgs(query),
      }),
      'search.donors',
    );
    return rows.map(toDonorDto);
  }
}

function toDonorDto(d: DonorSearchRow) {
  return {
    userId: d.user_id,
    name: d.name,
    bloodGroup: d.blood_group,
    organType: d.organ_type,
    city: d.city,
    hospitalName: d.hospital_name,
    // Only present when the donor opted in to sharing their number.
    phone: d.phone,
    distanceKm: roundKm(d.distance_km),
    lastDonationOn: d.last_donation_on,
    nextEligibleOn: d.next_eligible_on,
    isEligible: d.is_eligible,
    verifiedDonations: d.verified_donations,
    avgRating: d.avg_rating === null ? null : Number(d.avg_rating),
    ratingsCount: d.ratings_count,
  };
}
