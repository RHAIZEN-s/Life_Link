import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { unwrap, unwrapOne } from '../../common/db';
import type { HospitalRow, HospitalStaffRow } from '../../types/database.types';

@Injectable()
export class HospitalsService {
  constructor(private readonly supabase: SupabaseService) {}

  async search(query: string | undefined, limit: number, offset: number) {
    let builder = this.supabase
      .from('hospitals')
      .select('*')
      .order('is_verified', { ascending: false })
      .order('name')
      .range(offset, offset + limit - 1);
    if (query) {
      // Strip characters that are wildcards in LIKE or syntax in PostgREST's
      // or() filter, so user input can only ever match literally.
      const term = query.replace(/[%_*,()"\\]/g, ' ').trim();
      if (term) {
        builder = builder.or(`name.ilike.%${term}%,city.ilike.%${term}%`);
      }
    }
    return unwrap(await builder, 'hospitals.search').map(toHospitalDto);
  }

  async get(id: string) {
    const hospital = await this.getRow(id);
    const staff = unwrap(
      await this.supabase
        .from('hospital_staff')
        .select('*')
        .eq('hospital_id', id)
        .order('created_at'),
      'hospitals.staff',
    );
    return { ...toHospitalDto(hospital), staff: staff.map(toStaffDto) };
  }

  async getRow(id: string) {
    return unwrapOne(
      await this.supabase
        .from('hospitals')
        .select('*')
        .eq('id', id)
        .maybeSingle(),
      'hospitals.get',
      'Hospital not found',
    );
  }

  // Resolves the display name for a request/donation: a linked hospital wins
  // over free text.
  async resolveName(
    hospitalId: string | null | undefined,
    freeText: string | null | undefined,
  ) {
    if (hospitalId) return (await this.getRow(hospitalId)).name;
    if (freeText) return freeText;
    throw new BadRequestException('hospitalId or hospitalName is required');
  }
}

export function toHospitalDto(h: HospitalRow) {
  return {
    id: h.id,
    name: h.name,
    registrationNo: h.registration_no,
    address: h.address,
    city: h.city,
    state: h.state,
    latitude: h.latitude,
    longitude: h.longitude,
    phone: h.phone,
    email: h.email,
    isVerified: h.is_verified,
  };
}

export function toStaffDto(s: HospitalStaffRow) {
  return { id: s.id, name: s.name, title: s.title };
}
