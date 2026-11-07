import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  HospitalsService,
  toHospitalDto,
  toStaffDto,
} from '../hospitals/hospitals.service';
import { RequestsService, isActive } from '../requests/requests.service';
import { ProfileService, toStatsDto } from '../profile/profile.service';
import { NotificationsService } from '../notifications/notifications.service';
import { toDocumentDto } from '../documents/documents.service';
import { unwrap, unwrapOne, assertOk } from '../../common/db';
import {
  ACTIVE_REQUEST_STATUSES,
  type HospitalRow,
} from '../../types/database.types';
import {
  hospitalScope,
  requireHospital,
  type AuthUser,
} from '../auth/auth.types';
import {
  AddStaffDto,
  AnalyticsQueryDto,
  CreateHospitalDto,
  HospitalRequestsQueryDto,
  SendAlertDto,
  SuperAdminUpdateHospitalDto,
  UpdateHospitalDto,
  UsersQueryDto,
  VerifyUserDto,
} from './dto/admin.dto';

type CountQuery = PromiseLike<{
  count: number | null;
  error: { message: string; code?: string } | null;
}>;

@Injectable()
export class AdminService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly hospitals: HospitalsService,
    private readonly requests: RequestsService,
    private readonly profiles: ProfileService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Dashboard (hospital admins: their hospital; super admins: whole platform)
  // ---------------------------------------------------------------------------

  async dashboard(admin: AuthUser) {
    const scope = hospitalScope(admin);
    const hospital = scope ? await this.hospitals.getRow(scope) : null;
    const nowIso = new Date().toISOString();
    const dayEnd = new Date(Date.now() + 24 * 3600e3).toISOString();

    const reqs = () => {
      const q = this.supabase
        .from('donation_requests')
        .select('id', { count: 'exact', head: true })
        .in('status', ACTIVE_REQUEST_STATUSES)
        .eq('flagged', false);
      return scope ? q.eq('hospital_id', scope) : q;
    };
    const appts = () => {
      const q = this.supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true });
      return scope ? q.eq('hospital_id', scope) : q;
    };
    let donors = this.supabase
      .from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('available_to_donate', true)
      .not('blood_group', 'is', null);
    if (hospital?.city) donors = donors.ilike('city', hospital.city);
    let camps = this.supabase
      .from('camps')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .gte('ends_at', nowIso);
    if (scope) camps = camps.eq('hospital_id', scope);
    let pendingDonations = this.supabase
      .from('donations')
      .select('id', { count: 'exact', head: true })
      .is('verified_at', null)
      .not('hospital_id', 'is', null);
    if (scope) pendingDonations = pendingDonations.eq('hospital_id', scope);

    const [
      availableDonors,
      activeRequests,
      urgentRequests,
      unverifiedRequests,
      appointmentRequests,
      appointmentsToday,
      upcomingCamps,
      pendingVerifications,
      pendingDocuments,
      pendingDonationsCount,
      openReports,
    ] = await Promise.all([
      count(donors),
      count(reqs()),
      count(reqs().eq('priority', 'urgent')),
      count(reqs().eq('is_verified', false)),
      count(appts().eq('status', 'requested')),
      count(
        appts()
          .eq('status', 'scheduled')
          .gte('scheduled_at', nowIso)
          .lte('scheduled_at', dayEnd),
      ),
      count(camps),
      count(
        this.supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('verification_status', 'pending'),
      ),
      count(
        this.supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ),
      count(pendingDonations),
      admin.role === 'super_admin'
        ? count(
            this.supabase
              .from('reports')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'open'),
          )
        : Promise.resolve(0),
    ]);

    let urgent = this.supabase
      .from('donation_requests')
      .select('*')
      .in('status', ACTIVE_REQUEST_STATUSES)
      .eq('flagged', false)
      .in('priority', ['urgent', 'high'])
      .order('created_at', { ascending: false })
      .limit(5);
    if (scope) urgent = urgent.eq('hospital_id', scope);

    return {
      scope: scope ? 'hospital' : 'platform',
      hospital: hospital ? toHospitalDto(hospital) : null,
      stats: {
        availableDonors,
        activeRequests,
        urgentRequests,
        unverifiedRequests,
        appointmentRequests,
        appointmentsToday,
        upcomingCamps,
        pendingVerifications,
        pendingDocuments,
        pendingDonations: pendingDonationsCount,
        openReports,
      },
      urgentRequests: await this.requests.withCounts(
        unwrap(await urgent, 'admin.dashboard.urgent'),
      ),
      recentActivity: await this.recentActivity(scope),
    };
  }

  // Latest donor responses to requests in scope.
  private async recentActivity(scope: string | null) {
    let responses = this.supabase
      .from('request_responses')
      .select('request_id, donor_id, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(scope ? 200 : 10);
    if (scope) {
      const ids = unwrap(
        await this.supabase
          .from('donation_requests')
          .select('id')
          .eq('hospital_id', scope)
          .order('created_at', { ascending: false })
          .limit(200),
        'admin.activity.requestIds',
      ).map((r) => r.id);
      if (!ids.length) return [];
      responses = responses.in('request_id', ids);
    }
    const rows = unwrap(await responses, 'admin.activity.responses').slice(
      0,
      10,
    );
    if (!rows.length) return [];
    const [donors, requests] = await Promise.all([
      this.supabase
        .from('users')
        .select('id, name')
        .in('id', [...new Set(rows.map((r) => r.donor_id))]),
      this.supabase
        .from('donation_requests')
        .select('id, patient_name, blood_group, organ_type')
        .in('id', [...new Set(rows.map((r) => r.request_id))]),
    ]);
    const donorById = new Map(
      unwrap(donors, 'admin.activity.donors').map((d) => [d.id, d.name]),
    );
    const requestById = new Map(
      unwrap(requests, 'admin.activity.requests').map((r) => [r.id, r]),
    );
    return rows
      .filter((r) => requestById.has(r.request_id))
      .map((r) => {
        const request = requestById.get(r.request_id)!;
        return {
          requestId: r.request_id,
          donorName: donorById.get(r.donor_id) ?? 'A donor',
          patientName: request.patient_name,
          need: request.blood_group ?? request.organ_type,
          status: r.status,
          at: r.updated_at,
        };
      });
  }

  async analytics(admin: AuthUser, query: AnalyticsQueryDto) {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('from must be before to');
    }
    const data = unwrap(
      await this.supabase.client.rpc('admin_analytics', {
        p_hospital: hospitalScope(admin),
        p_from: query.from ?? null,
        p_to: query.to ?? null,
        p_city: query.city ?? null,
      }),
      'admin.analytics',
    );
    return data;
  }

  // ---------------------------------------------------------------------------
  // Hospital profile
  // ---------------------------------------------------------------------------

  async getHospital(admin: AuthUser) {
    return this.hospitals.get(requireHospital(admin));
  }

  async updateHospital(admin: AuthUser, dto: UpdateHospitalDto) {
    const id = requireHospital(admin);
    unwrap(
      await this.supabase
        .from('hospitals')
        .update(toHospitalUpdate(dto))
        .eq('id', id),
      'admin.updateHospital',
    );
    return this.hospitals.get(id);
  }

  async addStaff(admin: AuthUser, dto: AddStaffDto) {
    const row = unwrap(
      await this.supabase
        .from('hospital_staff')
        .insert({
          hospital_id: requireHospital(admin),
          name: dto.name,
          title: dto.title,
        })
        .select('*')
        .single(),
      'admin.addStaff',
    );
    return toStaffDto(row);
  }

  async removeStaff(admin: AuthUser, staffId: string) {
    const removed = unwrap(
      await this.supabase
        .from('hospital_staff')
        .delete()
        .eq('id', staffId)
        .eq('hospital_id', requireHospital(admin))
        .select('id'),
      'admin.removeStaff',
    );
    if (!removed.length) throw new NotFoundException('Staff member not found');
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // Requests oversight
  // ---------------------------------------------------------------------------

  async hospitalRequests(admin: AuthUser, query: HospitalRequestsQueryDto) {
    const scope = hospitalScope(admin);
    let builder = this.supabase
      .from('donation_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);
    if (scope) builder = builder.eq('hospital_id', scope);
    if (query.status === 'active') {
      builder = builder.in('status', ACTIVE_REQUEST_STATUSES);
    } else if (query.status) {
      builder = builder.eq('status', query.status);
    }
    if (query.unverified) builder = builder.eq('is_verified', false);
    return this.requests.withCounts(
      unwrap(await builder, 'admin.hospitalRequests'),
    );
  }

  async sendAlert(admin: AuthUser, dto: SendAlertDto) {
    const request = await this.requests.getRow(dto.requestId);
    if (!this.requests.canManage(admin, request)) {
      throw new ForbiddenException('This request belongs to another hospital');
    }
    if (!isActive(request.status)) {
      throw new ConflictException('Alerts can only be sent for open requests');
    }
    const notified = await this.requests.alertMatchingDonors(request, {
      title: dto.title ?? undefined,
      body: dto.message ?? undefined,
      radiusKm: dto.radiusKm,
    });
    return { notified };
  }

  // ---------------------------------------------------------------------------
  // User verification
  // ---------------------------------------------------------------------------

  async listUsers(query: UsersQueryDto) {
    let builder = this.supabase
      .from('users')
      .select(
        'id, name, email, role, status, verification_status, verification_note, created_at, suspension_reason',
      )
      .eq('role', 'user')
      .order('created_at', {
        ascending: query.verificationStatus === 'pending',
      })
      .range(query.offset, query.offset + query.limit - 1);
    if (query.verificationStatus) {
      builder = builder.eq('verification_status', query.verificationStatus);
    }
    if (query.status) builder = builder.eq('status', query.status);
    if (query.query) {
      const term = query.query.replace(/[%_*,()"\\]/g, ' ').trim();
      if (term) {
        builder = builder.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
      }
    }
    const users = unwrap(await builder, 'admin.listUsers');
    if (!users.length) return [];
    const profiles = unwrap(
      await this.supabase
        .from('profiles')
        .select('user_id, blood_group, city, registered_as, phone')
        .in(
          'user_id',
          users.map((u) => u.id),
        ),
      'admin.listUsers.profiles',
    );
    const profileById = new Map(profiles.map((p) => [p.user_id, p]));
    return users.map((u) => {
      const p = profileById.get(u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        status: u.status,
        verificationStatus: u.verification_status,
        verificationNote: u.verification_note,
        suspensionReason: u.suspension_reason,
        bloodGroup: p?.blood_group ?? null,
        city: p?.city ?? null,
        registeredAs: p?.registered_as ?? null,
        phone: p?.phone ?? null,
        createdAt: u.created_at,
      };
    });
  }

  // Everything a reviewer needs: profile (incl. health answers), documents, stats.
  async getUser(userId: string) {
    const user = unwrapOne(
      await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle(),
      'admin.getUser',
      'User not found',
    );
    const [profile, documents, stats, rating, requests, reports] =
      await Promise.all([
        this.profiles.getProfileRow(userId),
        this.supabase
          .from('documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        this.profiles.getStats(userId),
        this.profiles.getRating(userId),
        this.supabase
          .from('donation_requests')
          .select('id', { count: 'exact', head: true })
          .eq('requester_id', userId),
        this.supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('target_user_id', userId),
      ]);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      suspensionReason: user.suspension_reason,
      verificationStatus: user.verification_status,
      verificationNote: user.verification_note,
      verifiedAt: user.verified_at,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      profile: profile
        ? {
            dob: profile.dob,
            gender: profile.gender,
            bloodGroup: profile.blood_group,
            phone: profile.phone,
            address: profile.address,
            city: profile.city,
            registeredAs: profile.registered_as,
            availableToDonate: profile.available_to_donate,
            existingDiseases: profile.existing_diseases,
            geneticDisorder: profile.genetic_disorder,
            geneticDisorderOther: profile.genetic_disorder_other,
            hadSurgeryLast5Years: profile.had_surgery_last_5_years,
            allergies: profile.allergies,
            medications: profile.medications,
          }
        : null,
      documents: unwrap(documents, 'admin.getUser.documents').map(
        toDocumentDto,
      ),
      stats: toStatsDto(stats),
      rating,
      requestsCount: requests.count ?? 0,
      reportsCount: reports.count ?? 0,
    };
  }

  async verifyUser(admin: AuthUser, userId: string, dto: VerifyUserDto) {
    const user = unwrapOne(
      await this.supabase
        .from('users')
        .select('id, role')
        .eq('id', userId)
        .maybeSingle(),
      'admin.verifyUser.find',
      'User not found',
    );
    if (user.role !== 'user') {
      throw new BadRequestException('Staff accounts are verified by default');
    }
    if (dto.status === 'rejected' && !dto.note) {
      throw new BadRequestException(
        'Tell the user why, so they can fix it (note)',
      );
    }
    const now = new Date().toISOString();
    unwrap(
      await this.supabase
        .from('users')
        .update({
          verification_status: dto.status,
          verification_note: dto.note ?? null,
          verified_at: dto.status === 'verified' ? now : null,
          verified_by: admin.id,
        })
        .eq('id', userId),
      'admin.verifyUser',
    );
    // Close out the ID proofs that were waiting with this decision.
    unwrap(
      await this.supabase
        .from('documents')
        .update({
          status: dto.status === 'verified' ? 'approved' : 'rejected',
          review_note: dto.note ?? null,
          reviewed_by: admin.id,
          reviewed_at: now,
        })
        .eq('user_id', userId)
        .eq('doc_type', 'id_proof')
        .eq('status', 'pending'),
      'admin.verifyUser.documents',
    );
    await this.notifications.notify([
      {
        userId,
        type: 'verification',
        title:
          dto.status === 'verified'
            ? 'You are verified!'
            : 'Verification needs attention',
        body:
          dto.status === 'verified'
            ? 'Recipients nearby can now find you, and you can accept requests.'
            : `${dto.note} Upload a new ID proof from your profile to try again.`,
      },
    ]);
    return this.getUser(userId);
  }

  // ---------------------------------------------------------------------------
  // Super admin: hospitals
  // ---------------------------------------------------------------------------

  async listHospitals(limit: number, offset: number) {
    return this.hospitals.search(undefined, limit, offset);
  }

  async createHospital(dto: CreateHospitalDto) {
    const row = unwrap(
      await this.supabase
        .from('hospitals')
        .insert({
          ...toHospitalUpdate(dto),
          name: dto.name,
          registration_no: dto.registrationNo ?? null,
          is_verified: dto.isVerified ?? false,
        })
        .select('*')
        .single(),
      'admin.createHospital',
    );
    return toHospitalDto(row);
  }

  async superUpdateHospital(id: string, dto: SuperAdminUpdateHospitalDto) {
    await this.hospitals.getRow(id);
    const update: Partial<HospitalRow> = toHospitalUpdate(dto);
    if (dto.registrationNo !== undefined)
      update.registration_no = dto.registrationNo;
    if (dto.isVerified !== undefined) update.is_verified = dto.isVerified;
    unwrap(
      await this.supabase.from('hospitals').update(update).eq('id', id),
      'admin.superUpdateHospital',
    );
    return this.hospitals.get(id);
  }

  async assignHospitalAdmin(hospitalId: string, email: string) {
    await this.hospitals.getRow(hospitalId);
    const user = unwrap(
      await this.supabase
        .from('users')
        .select('id, role, is_verified')
        .eq('email', email)
        .maybeSingle(),
      'admin.assign.find',
    );
    if (!user || !user.is_verified) {
      throw new NotFoundException('No verified account with that email');
    }
    if (user.role === 'super_admin') {
      throw new BadRequestException(
        'Super admins cannot be assigned to a hospital',
      );
    }
    // The new role is picked up on the user's next token refresh.
    unwrapOne(
      await this.supabase
        .from('users')
        .update({
          role: 'hospital_admin',
          hospital_id: hospitalId,
          verification_status: 'verified',
        })
        .eq('id', user.id)
        .select('id')
        .maybeSingle(),
      'admin.assign',
    );
    await this.notifications.notify([
      {
        userId: user.id,
        type: 'system',
        title: 'You are now a hospital admin',
        body: 'Log out and back in to open the hospital dashboard.',
      },
    ]);
    return { ok: true };
  }
}

async function count(query: CountQuery) {
  const { count: total, error } = await query;
  assertOk(error, 'admin.count');
  return total ?? 0;
}

function toHospitalUpdate(dto: UpdateHospitalDto): Partial<HospitalRow> {
  const update: Partial<HospitalRow> = {};
  if (dto.name !== undefined) update.name = dto.name;
  if (dto.address !== undefined) update.address = dto.address;
  if (dto.city !== undefined) update.city = dto.city;
  if (dto.state !== undefined) update.state = dto.state;
  if (dto.latitude !== undefined) update.latitude = dto.latitude;
  if (dto.longitude !== undefined) update.longitude = dto.longitude;
  if (dto.phone !== undefined) update.phone = dto.phone;
  if (dto.email !== undefined) update.email = dto.email;
  return update;
}
