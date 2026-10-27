import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { HospitalsService } from '../hospitals/hospitals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProfileService, toStatsDto } from '../profile/profile.service';
import { unwrap, unwrapOne } from '../../common/db';
import { todayIst } from '../../common/dates';
import type { DonationRow } from '../../types/database.types';
import {
  requireHospital,
  scopedHospitalFor,
  type AuthUser,
} from '../auth/auth.types';
import { CertificateService } from './certificate.service';
import { CreateDonationDto, RecordDonationDto } from './dto/donations.dto';

@Injectable()
export class DonationsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly hospitals: HospitalsService,
    private readonly profiles: ProfileService,
    private readonly notifications: NotificationsService,
    private readonly certificates: CertificateService,
  ) {}

  async listMine(userId: string, limit: number, offset: number) {
    const [rows, stats] = await Promise.all([
      this.supabase
        .from('donations')
        .select('*')
        .eq('donor_id', userId)
        .order('donated_on', { ascending: false })
        .range(offset, offset + limit - 1),
      this.profiles.getStats(userId),
    ]);
    return {
      items: unwrap(rows, 'donations.listMine').map(toDonationDto),
      stats: toStatsDto(stats),
    };
  }

  // Self-reported donation; counts towards eligibility but not points until a
  // hospital verifies it.
  async create(userId: string, dto: CreateDonationDto) {
    const row = await this.insert(userId, dto, null);
    return toDonationDto(row);
  }

  async remove(userId: string, id: string) {
    const donation = await this.getOwned(userId, id);
    if (donation.verified_at) {
      throw new ConflictException('Verified donations cannot be deleted');
    }
    unwrap(
      await this.supabase.from('donations').delete().eq('id', id),
      'donations.remove',
    );
    return { ok: true };
  }

  async certificate(userId: string, id: string) {
    const donation = await this.getOwned(userId, id);
    if (!donation.verified_at) {
      throw new ConflictException(
        'A certificate is available once the hospital verifies this donation',
      );
    }
    const user = unwrapOne(
      await this.supabase
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .maybeSingle(),
      'donations.certificate.user',
    );
    const pdf = await this.certificates.render(
      donation,
      user.name ?? user.email,
    );
    return {
      pdf,
      fileName: `life-link-certificate-${donation.donated_on}.pdf`,
    };
  }

  // --- Hospital admin ---

  async record(admin: AuthUser, dto: RecordDonationDto) {
    const hospitalId = scopedHospitalFor(admin, dto.hospitalId);
    const donor = unwrap(
      await this.supabase
        .from('users')
        .select('id, is_verified, role')
        .eq('email', dto.donorEmail)
        .maybeSingle(),
      'donations.record.donor',
    );
    if (!donor || !donor.is_verified || donor.role !== 'user') {
      throw new NotFoundException('No verified donor account with that email');
    }
    const row = await this.insert(donor.id, { ...dto, hospitalId }, admin.id);
    await this.notifyVerified(row);
    return toDonationDto(row);
  }

  async listPendingForHospital(admin: AuthUser, limit: number, offset: number) {
    // Super admins see every hospital's queue.
    let builder = this.supabase
      .from('donations')
      .select('*')
      .is('verified_at', null)
      .not('hospital_id', 'is', null)
      .order('donated_on', { ascending: false })
      .range(offset, offset + limit - 1);
    if (admin.role !== 'super_admin') {
      builder = builder.eq('hospital_id', requireHospital(admin));
    }
    const rows = unwrap(await builder, 'donations.pending');
    const donors = await this.donorNames(rows.map((r) => r.donor_id));
    return rows.map((r) => ({
      ...toDonationDto(r),
      donor: donors.get(r.donor_id) ?? null,
    }));
  }

  async verify(admin: AuthUser, id: string) {
    const donation = unwrapOne(
      await this.supabase
        .from('donations')
        .select('*')
        .eq('id', id)
        .maybeSingle(),
      'donations.verify.find',
      'Donation not found',
    );
    if (
      admin.role !== 'super_admin' &&
      donation.hospital_id !== admin.hospitalId
    ) {
      throw new ForbiddenException(
        'This donation was not made at your hospital',
      );
    }
    if (donation.verified_at) throw new ConflictException('Already verified');

    const row = unwrap(
      await this.supabase
        .from('donations')
        .update({
          verified_at: new Date().toISOString(),
          verified_by: admin.id,
        })
        .eq('id', id)
        .select('*')
        .single(),
      'donations.verify',
    );
    await this.notifyVerified(row);
    return toDonationDto(row);
  }

  async insert(
    donorId: string,
    dto: CreateDonationDto,
    verifiedBy: string | null,
  ) {
    const today = todayIst();
    if (dto.donatedOn > today || dto.donatedOn < '1950-01-01') {
      throw new BadRequestException('donatedOn must be a past date');
    }
    if (dto.donationType === 'organ' && dto.units && dto.units !== 1) {
      throw new BadRequestException('Organ donations are recorded as 1 unit');
    }
    const hospitalName = await this.hospitals.resolveName(
      dto.hospitalId,
      dto.hospitalName,
    );
    const bloodGroup =
      dto.bloodGroup ??
      (await this.profiles.getProfileRow(donorId))?.blood_group ??
      null;

    return unwrap(
      await this.supabase
        .from('donations')
        .insert({
          donor_id: donorId,
          hospital_id: dto.hospitalId ?? null,
          hospital_name: hospitalName,
          donation_type: dto.donationType,
          blood_group: bloodGroup,
          units: dto.units ?? 1,
          donated_on: dto.donatedOn,
          request_id: dto.requestId ?? null,
          notes: dto.notes ?? null,
          verified_by: verifiedBy,
          verified_at: verifiedBy ? new Date().toISOString() : null,
        })
        .select('*')
        .single(),
      'donations.insert',
    );
  }

  private async getOwned(userId: string, id: string) {
    return unwrapOne(
      await this.supabase
        .from('donations')
        .select('*')
        .eq('id', id)
        .eq('donor_id', userId)
        .maybeSingle(),
      'donations.getOwned',
      'Donation not found',
    );
  }

  private async donorNames(ids: string[]) {
    const map = new Map<
      string,
      { id: string; name: string | null; email: string }
    >();
    if (!ids.length) return map;
    const users = unwrap(
      await this.supabase
        .from('users')
        .select('id, name, email')
        .in('id', [...new Set(ids)]),
      'donations.donorNames',
    );
    for (const u of users) map.set(u.id, u);
    return map;
  }

  private async notifyVerified(row: DonationRow) {
    await this.notifications.notify([
      {
        userId: row.donor_id,
        type: 'donation_verified',
        title: 'Donation verified',
        body: `${row.hospital_name} verified your donation on ${row.donated_on}. Your certificate is ready.`,
        data: { donationId: row.id },
      },
    ]);
  }
}

export function toDonationDto(d: DonationRow) {
  return {
    id: d.id,
    hospitalId: d.hospital_id,
    hospitalName: d.hospital_name,
    donationType: d.donation_type,
    bloodGroup: d.blood_group,
    units: d.units,
    donatedOn: d.donated_on,
    requestId: d.request_id,
    notes: d.notes,
    verified: d.verified_at !== null,
    verifiedAt: d.verified_at,
    certificateAvailable: d.verified_at !== null,
    createdAt: d.created_at,
  };
}
