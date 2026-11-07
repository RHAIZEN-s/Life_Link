import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '../supabase/supabase.service';
import { StorageService } from '../supabase/storage.service';
import { HospitalsService } from '../hospitals/hospitals.service';
import { CryptoService } from '../../common/crypto.service';
import { unwrap, unwrapOne } from '../../common/db';
import { inspectUpload, type UploadedFileLike } from '../../common/files';
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  BADGES,
  STORAGE_BUCKETS,
} from '../../common/constants';
import type {
  DonorStatsRow,
  OrganType,
  ProfileRow,
  UserRow,
} from '../../types/database.types';
import { isProfileComplete } from '../auth/auth.service';
import { TokenService } from '../auth/token.service';
import {
  UpdatePreferencesDto,
  UpsertProfileDto,
} from './dto/upsert-profile.dto';

const EMPTY_STATS: Omit<DonorStatsRow, 'user_id'> = {
  total_donations: 0,
  verified_donations: 0,
  last_donation_on: null,
  next_eligible_on: null,
  accepted_responses: 0,
  points: 0,
};

// Free-text health fields stored encrypted at rest.
const ENCRYPTED_FIELDS = [
  'existing_diseases',
  'genetic_disorder_other',
  'allergies',
  'medications',
] as const;

@Injectable()
export class ProfileService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService,
    private readonly hospitals: HospitalsService,
    private readonly crypto: CryptoService,
    private readonly tokens: TokenService,
  ) {}

  async getProfile(userId: string) {
    const [user, profile, pledges, stats, rating] = await Promise.all([
      this.getUser(userId),
      this.getProfileRow(userId),
      this.getPledges(userId),
      this.getStats(userId),
      this.getRating(userId),
    ]);

    const hospital = profile?.associated_hospital_id
      ? await this.hospitals.getRow(profile.associated_hospital_id)
      : null;
    const avatarUrl = await this.avatarUrl(profile?.avatar_path ?? null);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        verificationStatus: user.verification_status,
        verificationNote: user.verification_note,
        verifiedAt: user.verified_at,
        memberSince: user.created_at,
      },
      profile: profile
        ? {
            dob: profile.dob,
            gender: profile.gender,
            bloodGroup: profile.blood_group,
            phone: profile.phone,
            address: profile.address,
            city: profile.city,
            latitude: profile.latitude,
            longitude: profile.longitude,
            registeredAs: profile.registered_as,
            associatedHospital: hospital
              ? { id: hospital.id, name: hospital.name }
              : null,
            availableToDonate: profile.available_to_donate,
            shareContact: profile.share_contact,
            receiveNotifications: profile.receive_notifications,
            showOnLeaderboard: profile.show_on_leaderboard,
            themePreference: profile.theme_preference,
            existingDiseases: profile.existing_diseases,
            geneticDisorder: profile.genetic_disorder,
            geneticDisorderOther: profile.genetic_disorder_other,
            hadSurgeryLast5Years: profile.had_surgery_last_5_years,
            allergies: profile.allergies,
            medications: profile.medications,
            organPledges: pledges,
            avatarUrl,
          }
        : null,
      stats: toStatsDto(stats),
      rating,
      badges: toBadges(stats),
      profileCompleted: isProfileComplete(profile),
    };
  }

  async upsertProfile(userId: string, dto: UpsertProfileDto) {
    assertValidDob(dto.dob);
    if (dto.associatedHospitalId) {
      await this.hospitals.getRow(dto.associatedHospitalId);
    }
    const existing = await this.getProfileRow(userId);
    const registeredAs = dto.registeredAs ?? existing?.registered_as ?? 'donor';
    const bloodGroup =
      dto.bloodGroup !== undefined
        ? dto.bloodGroup
        : (existing?.blood_group ?? null);
    if (registeredAs === 'donor' && !bloodGroup) {
      throw new BadRequestException('Donors must provide their blood group');
    }

    unwrap(
      await this.supabase
        .from('users')
        .update({ name: dto.name })
        .eq('id', userId),
      'profile.upsert.name',
    );

    const row: Partial<ProfileRow> & { user_id: string } = {
      user_id: userId,
      dob: dto.dob,
      gender: dto.gender,
      blood_group: bloodGroup,
      phone: dto.phone,
      address: dto.address,
      registered_as: registeredAs,
    };
    // Optional fields: only write what the client sent.
    const optional: [keyof UpsertProfileDto, keyof ProfileRow][] = [
      ['city', 'city'],
      ['latitude', 'latitude'],
      ['longitude', 'longitude'],
      ['associatedHospitalId', 'associated_hospital_id'],
      ['availableToDonate', 'available_to_donate'],
      ['shareContact', 'share_contact'],
      ['receiveNotifications', 'receive_notifications'],
      ['showOnLeaderboard', 'show_on_leaderboard'],
      ['themePreference', 'theme_preference'],
      ['existingDiseases', 'existing_diseases'],
      ['geneticDisorder', 'genetic_disorder'],
      ['geneticDisorderOther', 'genetic_disorder_other'],
      ['hadSurgeryLast5Years', 'had_surgery_last_5_years'],
      ['allergies', 'allergies'],
      ['medications', 'medications'],
    ];
    for (const [from, to] of optional) {
      if (dto[from] !== undefined) {
        (row as Record<string, unknown>)[to] = dto[from];
      }
    }
    if (dto.geneticDisorder !== undefined && dto.geneticDisorder !== 'other') {
      row.genetic_disorder_other = null;
    }
    for (const field of ENCRYPTED_FIELDS) {
      if (row[field] !== undefined) {
        row[field] = this.crypto.encrypt(row[field]) ?? null;
      }
    }

    unwrap(
      await this.supabase
        .from('profiles')
        .upsert(row, { onConflict: 'user_id' }),
      'profile.upsert',
    );

    if (dto.organPledges !== undefined) {
      await this.replacePledges(userId, dto.organPledges);
    }
    return this.getProfile(userId);
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const update: Partial<ProfileRow> = {};
    if (dto.availableToDonate !== undefined)
      update.available_to_donate = dto.availableToDonate;
    if (dto.shareContact !== undefined) update.share_contact = dto.shareContact;
    if (dto.receiveNotifications !== undefined)
      update.receive_notifications = dto.receiveNotifications;
    if (dto.showOnLeaderboard !== undefined)
      update.show_on_leaderboard = dto.showOnLeaderboard;
    if (dto.themePreference !== undefined)
      update.theme_preference = dto.themePreference;
    if (dto.latitude !== undefined) update.latitude = dto.latitude;
    if (dto.longitude !== undefined) update.longitude = dto.longitude;
    if (dto.city !== undefined) update.city = dto.city;
    if (!Object.keys(update).length) {
      throw new BadRequestException('Nothing to update');
    }
    unwrap(
      await this.supabase
        .from('profiles')
        .upsert({ user_id: userId, ...update }, { onConflict: 'user_id' }),
      'profile.preferences',
    );
    return this.getProfile(userId);
  }

  async setAvatar(userId: string, file: UploadedFileLike | undefined) {
    const { mime, ext } = inspectUpload(
      file,
      AVATAR_MIME_TYPES,
      AVATAR_MAX_BYTES,
    );
    const profile = await this.getProfileRow(userId);
    if (!profile) {
      throw new BadRequestException(
        'Complete your profile before adding a photo',
      );
    }

    const path = `${userId}/${randomUUID()}.${ext}`;
    await this.storage.upload(
      STORAGE_BUCKETS.avatars,
      path,
      file!.buffer,
      mime,
    );
    unwrap(
      await this.supabase
        .from('profiles')
        .update({ avatar_path: path })
        .eq('user_id', userId),
      'profile.setAvatar',
    );
    if (profile.avatar_path) {
      await this.storage.remove(STORAGE_BUCKETS.avatars, [profile.avatar_path]);
    }
    return {
      avatarUrl: await this.storage.signedUrl(STORAGE_BUCKETS.avatars, path),
    };
  }

  async removeAvatar(userId: string) {
    const profile = await this.getProfileRow(userId);
    if (profile?.avatar_path) {
      unwrap(
        await this.supabase
          .from('profiles')
          .update({ avatar_path: null })
          .eq('user_id', userId),
        'profile.removeAvatar',
      );
      await this.storage.remove(STORAGE_BUCKETS.avatars, [profile.avatar_path]);
    }
    return { ok: true };
  }

  // Feedback that requesters left for this donor.
  async feedback(userId: string) {
    const rows = unwrap(
      await this.supabase
        .from('ratings')
        .select('score, comment, created_at, request_id')
        .eq('donor_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      'profile.feedback',
    );
    return {
      rating: await this.getRating(userId),
      items: rows.map((r) => ({
        score: r.score,
        comment: r.comment,
        requestId: r.request_id,
        createdAt: r.created_at,
      })),
    };
  }

  // GDPR-style export of everything stored about the user.
  async exportData(userId: string) {
    const q = <T extends Parameters<SupabaseService['from']>[0]>(
      table: T,
      column: string,
    ) =>
      this.supabase
        .from(table)
        .select('*')
        .eq(column as never, userId as never);

    const [
      user,
      profile,
      pledges,
      requests,
      responses,
      appointments,
      donations,
      documents,
      notifications,
      ratingsGiven,
      ratingsReceived,
      reports,
      camps,
    ] = await Promise.all([
      this.getUser(userId),
      this.getProfileRow(userId),
      q('organ_pledges', 'user_id'),
      q('donation_requests', 'requester_id'),
      q('request_responses', 'donor_id'),
      q('appointments', 'donor_id'),
      q('donations', 'donor_id'),
      q('documents', 'user_id'),
      q('notifications', 'user_id'),
      q('ratings', 'rater_id'),
      q('ratings', 'donor_id'),
      q('reports', 'reporter_id'),
      q('camp_registrations', 'user_id'),
    ]);
    const { password_hash: _secret, ...account } = user;
    void _secret;
    return {
      exportedAt: new Date().toISOString(),
      account,
      profile,
      organPledges: unwrap(pledges, 'export.pledges'),
      requests: unwrap(requests, 'export.requests'),
      requestResponses: unwrap(responses, 'export.responses'),
      appointments: unwrap(appointments, 'export.appointments'),
      donations: unwrap(donations, 'export.donations'),
      documents: unwrap(documents, 'export.documents'),
      notifications: unwrap(notifications, 'export.notifications'),
      ratingsGiven: unwrap(ratingsGiven, 'export.ratingsGiven'),
      ratingsReceived: unwrap(ratingsReceived, 'export.ratingsReceived'),
      reportsFiled: unwrap(reports, 'export.reports'),
      campRegistrations: unwrap(camps, 'export.camps'),
    };
  }

  // Permanently deletes the account; all related rows cascade.
  async deleteAccount(userId: string, password: string) {
    const user = await this.getUser(userId);
    if (user.role !== 'user') {
      throw new ForbiddenException(
        'Staff accounts must be removed by a super admin',
      );
    }
    if (
      !user.password_hash ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      throw new UnauthorizedException('Incorrect password');
    }
    const [profile, documents] = await Promise.all([
      this.getProfileRow(userId),
      this.supabase
        .from('documents')
        .select('storage_path')
        .eq('user_id', userId),
    ]);
    await this.tokens.revokeAllForUser(userId);
    unwrap(
      await this.supabase.from('users').delete().eq('id', userId),
      'profile.deleteAccount',
    );
    // Files last: if this fails, only orphaned private files remain.
    const docPaths = unwrap(documents, 'profile.delete.docs').map(
      (d) => d.storage_path,
    );
    if (docPaths.length) {
      await this.storage.remove(STORAGE_BUCKETS.documents, docPaths);
    }
    if (profile?.avatar_path) {
      await this.storage.remove(STORAGE_BUCKETS.avatars, [profile.avatar_path]);
    }
    return { ok: true };
  }

  async getStats(userId: string): Promise<Omit<DonorStatsRow, 'user_id'>> {
    const stats = unwrap(
      await this.supabase.client
        .from('donor_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      'profile.stats',
    );
    return stats ?? EMPTY_STATS;
  }

  async getRating(userId: string) {
    const row = unwrap(
      await this.supabase.client
        .from('donor_ratings')
        .select('avg_rating, ratings_count')
        .eq('user_id', userId)
        .maybeSingle(),
      'profile.rating',
    );
    return {
      average: row?.avg_rating === null || !row ? null : Number(row.avg_rating),
      count: row?.ratings_count ?? 0,
    };
  }

  // Decrypted profile row.
  async getProfileRow(userId: string): Promise<ProfileRow | null> {
    const row = unwrap(
      await this.supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      'profile.get',
    );
    if (!row) return null;
    for (const field of ENCRYPTED_FIELDS) {
      row[field] = this.crypto.decrypt(row[field]);
    }
    return row;
  }

  async avatarUrl(path: string | null) {
    return path ? this.storage.signedUrl(STORAGE_BUCKETS.avatars, path) : null;
  }

  private async getUser(userId: string): Promise<UserRow> {
    return unwrapOne(
      await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle(),
      'profile.user',
      'Account not found',
    );
  }

  private async getPledges(userId: string) {
    return unwrap(
      await this.supabase
        .from('organ_pledges')
        .select('organ_type')
        .eq('user_id', userId)
        .order('organ_type'),
      'profile.pledges',
    ).map((p) => p.organ_type);
  }

  private async replacePledges(userId: string, organs: OrganType[]) {
    unwrap(
      await this.supabase.from('organ_pledges').delete().eq('user_id', userId),
      'profile.pledges.clear',
    );
    if (organs.length) {
      unwrap(
        await this.supabase
          .from('organ_pledges')
          .insert(
            organs.map((organ_type) => ({ user_id: userId, organ_type })),
          ),
        'profile.pledges.insert',
      );
    }
  }
}

function assertValidDob(dob: string) {
  const date = new Date(`${dob}T00:00:00Z`);
  const now = new Date();
  if (
    Number.isNaN(date.getTime()) ||
    date > now ||
    date.getUTCFullYear() < 1900
  ) {
    throw new BadRequestException('dob must be a valid past date');
  }
}

export function toStatsDto(stats: Omit<DonorStatsRow, 'user_id'>) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    totalDonations: stats.total_donations,
    verifiedDonations: stats.verified_donations,
    acceptedResponses: stats.accepted_responses,
    points: stats.points,
    lastDonationOn: stats.last_donation_on,
    nextEligibleOn: stats.next_eligible_on,
    isEligible: !stats.next_eligible_on || stats.next_eligible_on <= today,
  };
}

export function toBadges(stats: Omit<DonorStatsRow, 'user_id'>) {
  return BADGES.map((badge) => ({
    id: badge.id,
    label: badge.label,
    earned:
      'minVerified' in badge
        ? stats.verified_donations >= badge.minVerified
        : stats.accepted_responses >= badge.minAccepted,
  }));
}
