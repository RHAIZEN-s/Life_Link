import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { HospitalsService } from '../hospitals/hospitals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProfileService, toStatsDto } from '../profile/profile.service';
import { unwrap, unwrapOne } from '../../common/db';
import { geoArgs, roundKm } from '../../common/query.dto';
import {
  ALERT_POLICY,
  MAX_ACTIVE_REQUESTS_PER_USER,
  bloodCompatible,
  organNeedsAbo,
} from '../../common/matching';
import {
  ACTIVE_REQUEST_STATUSES,
  type AppointmentRow,
  type DonationRequestRow,
  type OpenRequestRow,
  type RequestEventType,
  type RequestStatus,
} from '../../types/database.types';
import type { AuthUser } from '../auth/auth.types';
import {
  CreateRequestDto,
  ListRequestsQueryDto,
  MyRequestsQueryDto,
  MyResponsesQueryDto,
  RateDto,
  RespondDto,
} from './dto/requests.dto';

export const isActive = (status: RequestStatus) =>
  ACTIVE_REQUEST_STATUSES.includes(status);

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly hospitals: HospitalsService,
    private readonly notifications: NotificationsService,
    private readonly profiles: ProfileService,
  ) {}

  // ---------------------------------------------------------------------------
  // Reading
  // ---------------------------------------------------------------------------

  async listOpen(viewer: AuthUser, query: ListRequestsQueryDto) {
    const rows = unwrap(
      await this.supabase.client.rpc('list_open_requests', {
        p_viewer: viewer.id,
        p_request_type: query.type ?? null,
        p_blood_group: query.bloodGroup ?? null,
        p_organ_type: query.organType ?? null,
        p_compatible_only: query.compatibleOnly ?? false,
        ...geoArgs(query),
      }),
      'requests.listOpen',
    );
    return rows.map(toOpenRequestDto);
  }

  async listMine(userId: string, query: MyRequestsQueryDto) {
    let builder = this.supabase
      .from('donation_requests')
      .select('*')
      .eq('requester_id', userId)
      .order('created_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);
    if (query.status === 'active') {
      builder = builder.in('status', ACTIVE_REQUEST_STATUSES);
    } else if (query.status) {
      builder = builder.eq('status', query.status);
    }
    return this.withCounts(unwrap(await builder, 'requests.listMine'));
  }

  // Adds accepted-donor counts to plain request rows.
  async withCounts(rows: DonationRequestRow[]) {
    const counts = await this.acceptedCounts(rows.map((r) => r.id));
    return rows.map((r) => ({
      ...toRequestDto(r),
      acceptedCount: counts.get(r.id) ?? 0,
    }));
  }

  async get(viewer: AuthUser, id: string) {
    const request = await this.getRow(id);
    const canManage = this.canManage(viewer, request);
    const [counts, mine, profile, myAppointment, ratings] = await Promise.all([
      this.acceptedCounts([id]),
      this.supabase
        .from('request_responses')
        .select('status')
        .eq('request_id', id)
        .eq('donor_id', viewer.id)
        .maybeSingle(),
      this.profiles.getProfileRow(viewer.id),
      this.supabase
        .from('appointments')
        .select('*')
        .eq('request_id', id)
        .eq('donor_id', viewer.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      this.supabase
        .from('ratings')
        .select('donor_id, hospital_id, score')
        .eq('request_id', id)
        .eq('rater_id', viewer.id),
    ]);
    const myResponse = unwrap(mine, 'requests.get.mine')?.status ?? null;
    if (request.flagged && !canManage && myResponse === null) {
      throw new NotFoundException('Request not found');
    }

    const dto = toRequestDto(request);
    return {
      ...dto,
      // Contact details are shared only with accepted donors and coordinators.
      contactPhone:
        canManage || myResponse === 'accepted' ? dto.contactPhone : null,
      acceptedCount: counts.get(id) ?? 0,
      myResponse,
      canDonate: canDonateTo(profile, request),
      isOwner: request.requester_id === viewer.id,
      canManage,
      myAppointment: toAppointmentDto(
        unwrap(myAppointment, 'requests.get.appointment'),
      ),
      myRatings: unwrap(ratings, 'requests.get.ratings').map((r) => ({
        donorId: r.donor_id,
        hospitalId: r.hospital_id,
        score: r.score,
      })),
      responders: canManage ? await this.responders(id) : undefined,
      timeline: canManage ? await this.timeline(id) : undefined,
    };
  }

  // Ranked compatible donors for a request (coordinators only).
  async matches(viewer: AuthUser, id: string) {
    const request = await this.getRow(id);
    if (!this.canManage(viewer, request)) {
      throw new ForbiddenException('You cannot view matches for this request');
    }
    const policy = ALERT_POLICY[request.priority];
    const rows = unwrap(
      await this.supabase.client.rpc('match_donors', {
        p_request: id,
        p_radius_km: policy.radiusKm * 2,
        p_limit: 30,
      }),
      'requests.matches',
    );
    return rows.map((m) => ({
      donorId: m.user_id,
      name: m.name,
      bloodGroup: m.blood_group,
      city: m.city,
      distanceKm: m.distance_km,
      score: Number(m.score),
      isEligible: m.is_eligible,
      verifiedDonations: m.verified_donations,
      avgRating: m.avg_rating === null ? null : Number(m.avg_rating),
      alreadyAlerted: m.already_alerted,
      response: m.response,
    }));
  }

  async myResponses(userId: string, query: MyResponsesQueryDto) {
    let builder = this.supabase
      .from('request_responses')
      .select('*')
      .eq('donor_id', userId)
      .order('updated_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);
    if (query.status) builder = builder.eq('status', query.status);
    const responses = unwrap(await builder, 'requests.myResponses');
    if (!responses.length) return [];

    const requests = unwrap(
      await this.supabase
        .from('donation_requests')
        .select('*')
        .in(
          'id',
          responses.map((r) => r.request_id),
        ),
      'requests.myResponses.requests',
    );
    const byId = new Map(requests.map((r) => [r.id, r]));
    return responses
      .filter((r) => byId.has(r.request_id))
      .map((r) => ({
        status: r.status,
        message: r.message,
        assigned: r.assigned_by !== null,
        respondedAt: r.updated_at,
        request: toRequestDto(byId.get(r.request_id)!),
      }));
  }

  // ---------------------------------------------------------------------------
  // Recipient actions
  // ---------------------------------------------------------------------------

  async create(user: AuthUser, dto: CreateRequestDto) {
    const isStaff = user.role !== 'user';
    if (!isStaff) await this.assertUnderActiveLimit(user.id);

    // Hospital admins always post on behalf of their own hospital.
    const hospitalId =
      user.role === 'hospital_admin'
        ? user.hospitalId
        : (dto.hospitalId ?? null);
    const hospitalName = await this.hospitals.resolveName(
      hospitalId,
      dto.hospitalName,
    );
    if (dto.documentId) await this.assertOwnDocument(user.id, dto.documentId);

    const row = unwrap(
      await this.supabase
        .from('donation_requests')
        .insert({
          requester_id: user.id,
          hospital_id: hospitalId,
          hospital_name: hospitalName,
          patient_name: dto.patientName,
          patient_age: dto.patientAge ?? null,
          patient_gender: dto.patientGender ?? null,
          request_type: dto.requestType,
          blood_group: dto.bloodGroup ?? null,
          organ_type:
            dto.requestType === 'organ' ? (dto.organType ?? null) : null,
          units_required:
            dto.requestType === 'blood' ? (dto.unitsRequired ?? null) : null,
          priority: dto.priority ?? 'medium',
          status: 'pending',
          contact_phone: dto.contactPhone,
          location_text: dto.locationText,
          city: dto.city ?? null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          needed_by: dto.neededBy ?? null,
          notes: dto.notes ?? null,
          document_id: dto.documentId ?? null,
          // Requests posted by hospital staff are trusted.
          is_verified: isStaff,
          verified_by: isStaff ? user.id : null,
          verified_at: isStaff ? new Date().toISOString() : null,
        })
        .select('*')
        .single(),
      'requests.create',
    );
    await this.logEvent(row.id, 'created', user.id);

    // Best effort: a failed alert must not fail the request itself.
    let alertedDonors = 0;
    try {
      alertedDonors = await this.alertMatchingDonors(row);
    } catch (err) {
      this.logger.error(
        `Alerting donors for ${row.id} failed`,
        err instanceof Error ? err.stack : String(err),
      );
    }
    if (!isStaff) {
      await this.notifications.notifyHospitalAdmins(row.hospital_id, {
        type: 'request_update',
        title: `New ${row.priority === 'urgent' ? 'URGENT ' : ''}request at your hospital`,
        body: `${needLabel(row)} for ${row.patient_name}. Review and verify it.`,
        data: { requestId: row.id },
      });
    }
    return { ...toRequestDto(row), acceptedCount: 0, alertedDonors };
  }

  async updateStatus(
    user: AuthUser,
    id: string,
    status: 'completed' | 'cancelled',
    reason?: string | null,
  ) {
    const request = await this.getRow(id);
    if (!this.canManage(user, request)) {
      throw new ForbiddenException('You cannot change this request');
    }
    if (!isActive(request.status)) {
      throw new ConflictException(`Request is already ${request.status}`);
    }
    return this.close(request, status, user.id, reason ?? null);
  }

  // Closes a request and tells everyone involved.
  async close(
    request: DonationRequestRow,
    status: 'completed' | 'cancelled',
    actorId: string,
    reason: string | null,
    flagged = false,
  ) {
    const now = new Date().toISOString();
    const updated = unwrap(
      await this.supabase
        .from('donation_requests')
        .update({
          status,
          completed_at: status === 'completed' ? now : null,
          closed_by: actorId,
          close_reason: reason,
          flagged: flagged || request.flagged,
        })
        .eq('id', request.id)
        .select('*')
        .single(),
      'requests.close',
    );
    await this.logEvent(
      request.id,
      flagged ? 'flagged' : status,
      actorId,
      reason,
    );

    // Open appointments are no longer needed.
    const cancelled = unwrap(
      await this.supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancelled_by: actorId,
          cancel_reason:
            status === 'completed' ? 'Request fulfilled' : 'Request cancelled',
        })
        .eq('request_id', request.id)
        .in('status', ['requested', 'scheduled'])
        .select('donor_id'),
      'requests.close.appointments',
    );
    const cancelledDonors = new Set(cancelled.map((a) => a.donor_id));

    const donors = await this.acceptedDonorIds(request.id);
    const title =
      status === 'completed'
        ? `Request for ${request.patient_name} fulfilled`
        : `Request for ${request.patient_name} closed`;
    await this.notifications.notify(
      donors.map((donorId) => ({
        userId: donorId,
        type: 'request_update' as const,
        title,
        body:
          status === 'completed'
            ? 'Thank you for stepping up. Your help made a difference.'
            : `It is no longer needed${cancelledDonors.has(donorId) ? ' and your appointment was cancelled' : ''}. Thank you for responding.`,
        data: { requestId: request.id },
      })),
    );
    if (actorId !== request.requester_id) {
      await this.notifications.notify([
        {
          userId: request.requester_id,
          type: flagged ? 'moderation' : 'request_update',
          title: flagged
            ? 'Your request was removed'
            : status === 'completed'
              ? 'Your request was marked completed'
              : 'Your request was cancelled',
          body:
            reason ??
            (status === 'completed'
              ? 'Rate the donors who helped you from the request page.'
              : 'Contact the hospital if this was a mistake.'),
          data: { requestId: request.id },
        },
      ]);
    }
    await this.notifications.notifyHospitalAdmins(
      request.hospital_id,
      {
        type: 'request_update',
        title,
        body: reason ?? `Status: ${status}`,
        data: { requestId: request.id },
      },
      actorId,
    );
    return toRequestDto(updated);
  }

  async rate(user: AuthUser, id: string, dto: RateDto) {
    const request = await this.getRow(id);
    if (request.requester_id !== user.id) {
      throw new ForbiddenException('Only the requester can leave feedback');
    }
    if (request.status !== 'completed') {
      throw new ConflictException('You can rate once the request is completed');
    }
    if (dto.target === 'donor') {
      const helped = unwrap(
        await this.supabase
          .from('request_responses')
          .select('id')
          .eq('request_id', id)
          .eq('donor_id', dto.donorId!)
          .eq('status', 'accepted')
          .maybeSingle(),
        'requests.rate.helped',
      );
      if (!helped) {
        throw new BadRequestException(
          'This donor did not help with the request',
        );
      }
    } else if (!request.hospital_id) {
      throw new BadRequestException(
        'This request is not linked to a registered hospital',
      );
    }
    unwrap(
      await this.supabase.from('ratings').insert({
        request_id: id,
        rater_id: user.id,
        donor_id: dto.target === 'donor' ? dto.donorId! : null,
        hospital_id: dto.target === 'hospital' ? request.hospital_id : null,
        score: dto.score,
        comment: dto.comment ?? null,
      }),
      'requests.rate',
    );
    if (dto.target === 'donor') {
      await this.notifications.notify([
        {
          userId: dto.donorId!,
          type: 'system',
          title: `You received ${dto.score}★ feedback`,
          body: dto.comment
            ? `“${dto.comment}”`
            : `The family of ${request.patient_name} thanked you.`,
          data: { requestId: id },
        },
      ]);
    }
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // Donor actions
  // ---------------------------------------------------------------------------

  async respond(user: AuthUser, id: string, dto: RespondDto) {
    if (user.role !== 'user') {
      throw new ForbiddenException('Staff accounts cannot respond as donors');
    }
    const request = await this.getRow(id);
    if (request.requester_id === user.id) {
      throw new BadRequestException('You cannot respond to your own request');
    }
    if (!isActive(request.status) || request.flagged) {
      throw new ConflictException('This request is no longer open');
    }
    if (dto.status === 'accepted') await this.assertCanDonate(user, request);

    const previous = unwrap(
      await this.supabase
        .from('request_responses')
        .select('status')
        .eq('request_id', id)
        .eq('donor_id', user.id)
        .maybeSingle(),
      'requests.respond.previous',
    );
    const response = unwrap(
      await this.supabase
        .from('request_responses')
        .upsert(
          {
            request_id: id,
            donor_id: user.id,
            status: dto.status,
            message: dto.message ?? null,
          },
          { onConflict: 'request_id,donor_id' },
        )
        .select('*')
        .single(),
      'requests.respond',
    );

    const donorName = await this.userName(user.id);
    if (dto.status === 'accepted' && previous?.status !== 'accepted') {
      await this.logEvent(id, 'donor_accepted', user.id, donorName);
      const notification = {
        type: 'request_response' as const,
        title: `${donorName} accepted the request`,
        body: `A donor is ready to help ${request.patient_name}. Open the request to see their details and schedule the donation.`,
        data: { requestId: id, donorId: user.id },
      };
      await this.notifications.notify([
        { ...notification, userId: request.requester_id },
      ]);
      await this.notifications.notifyHospitalAdmins(
        request.hospital_id,
        notification,
        request.requester_id,
      );
    }
    if (dto.status === 'declined' && previous?.status === 'accepted') {
      // Withdrawing also cancels any appointment that was set up.
      unwrap(
        await this.supabase
          .from('appointments')
          .update({
            status: 'cancelled',
            cancelled_by: user.id,
            cancel_reason: 'Donor withdrew',
          })
          .eq('request_id', id)
          .eq('donor_id', user.id)
          .in('status', ['requested', 'scheduled']),
        'requests.respond.cancelAppointment',
      );
      await this.logEvent(id, 'donor_declined', user.id, donorName);
      await this.notifications.notify([
        {
          userId: request.requester_id,
          type: 'request_update',
          title: `${donorName} can no longer donate`,
          body: `We'll keep looking for donors for ${request.patient_name}.`,
          data: { requestId: id },
        },
      ]);
    }
    await this.recomputeStatus(id);

    return {
      requestId: id,
      status: response.status,
      message: response.message,
    };
  }

  // ---------------------------------------------------------------------------
  // Coordinator / admin actions
  // ---------------------------------------------------------------------------

  async verify(admin: AuthUser, id: string) {
    const request = await this.getRow(id);
    this.assertAdminFor(admin, request);
    if (request.is_verified) return toRequestDto(request);
    const updated = unwrap(
      await this.supabase
        .from('donation_requests')
        .update({
          is_verified: true,
          verified_by: admin.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single(),
      'requests.verify',
    );
    await this.logEvent(id, 'verified', admin.id);
    await this.notifications.notify([
      {
        userId: request.requester_id,
        type: 'request_update',
        title: 'Your request was verified',
        body: `${request.hospital_name} confirmed the request for ${request.patient_name}. Donors will see a verified badge.`,
        data: { requestId: id },
      },
    ]);
    return toRequestDto(updated);
  }

  // Removes a fake or abusive request.
  async flag(admin: AuthUser, id: string, reason: string) {
    const request = await this.getRow(id);
    this.assertAdminFor(admin, request);
    if (!isActive(request.status)) {
      unwrap(
        await this.supabase
          .from('donation_requests')
          .update({ flagged: true, close_reason: reason })
          .eq('id', id),
        'requests.flag.closed',
      );
      await this.logEvent(id, 'flagged', admin.id, reason);
      return toRequestDto({ ...request, flagged: true, close_reason: reason });
    }
    return this.close(request, 'cancelled', admin.id, reason, true);
  }

  // Manually assigns a donor (e.g. after a phone call) when auto-matching fails.
  async assignDonor(admin: AuthUser, id: string, donorId: string) {
    const request = await this.getRow(id);
    this.assertAdminFor(admin, request);
    if (!isActive(request.status)) {
      throw new ConflictException('This request is no longer open');
    }
    const donor = await this.getActiveDonor(donorId);
    unwrap(
      await this.supabase.from('request_responses').upsert(
        {
          request_id: id,
          donor_id: donor.id,
          status: 'accepted',
          assigned_by: admin.id,
          message: 'Assigned by hospital',
        },
        { onConflict: 'request_id,donor_id' },
      ),
      'requests.assign',
    );
    await this.logEvent(id, 'donor_assigned', admin.id, donor.name);
    await this.notifications.notify([
      {
        userId: donor.id,
        type: 'request_update',
        title: 'You have been matched to a request',
        body: `${request.hospital_name} assigned you to help ${request.patient_name}. They will schedule your donation.`,
        data: { requestId: id },
      },
      {
        userId: request.requester_id,
        type: 'request_response',
        title: 'A donor was assigned to your request',
        body: `${request.hospital_name} assigned ${donor.name ?? 'a donor'}.`,
        data: { requestId: id, donorId: donor.id },
      },
    ]);
    await this.recomputeStatus(id);
    return this.get(admin, id);
  }

  // Personally asks one matching donor to help.
  async invite(viewer: AuthUser, id: string, donorId: string) {
    const request = await this.getRow(id);
    if (!this.canManage(viewer, request)) {
      throw new ForbiddenException('You cannot invite donors to this request');
    }
    if (!isActive(request.status)) {
      throw new ConflictException('This request is no longer open');
    }
    await this.getActiveDonor(donorId);
    const inserted = unwrap(
      await this.supabase
        .from('request_alerts')
        .upsert(
          { request_id: id, donor_id: donorId },
          { onConflict: 'request_id,donor_id', ignoreDuplicates: true },
        )
        .select('donor_id'),
      'requests.invite',
    );
    if (!inserted.length) {
      throw new ConflictException('This donor has already been notified');
    }
    await this.notifications.notify([
      {
        userId: donorId,
        type: 'request_alert',
        title: `You're a match: ${needLabel(request)} needed`,
        body: `${request.hospital_name}, ${request.location_text}. Can you help ${request.patient_name}?`,
        data: { requestId: id },
      },
    ]);
    return { ok: true };
  }

  // Alerts the best-matching donors that haven't been alerted yet.
  async alertMatchingDonors(
    request: DonationRequestRow,
    overrides: { title?: string; body?: string; radiusKm?: number } = {},
  ) {
    const policy = ALERT_POLICY[request.priority];
    const matches = unwrap(
      await this.supabase.client.rpc('match_donors', {
        p_request: request.id,
        p_radius_km: overrides.radiusKm ?? policy.radiusKm,
        p_limit: 200,
      }),
      'requests.alert.match',
    )
      .filter(
        (m) =>
          m.is_eligible &&
          m.receive_notifications &&
          !m.already_alerted &&
          m.response === null,
      )
      .slice(0, policy.maxDonors);
    if (!matches.length) return 0;

    unwrap(
      await this.supabase.from('request_alerts').upsert(
        matches.map((m) => ({
          request_id: request.id,
          donor_id: m.user_id,
          score: Number(m.score),
        })),
        { onConflict: 'request_id,donor_id', ignoreDuplicates: true },
      ),
      'requests.alert.record',
    );
    const urgency =
      request.priority === 'urgent'
        ? 'URGENT'
        : request.priority === 'high'
          ? 'High priority'
          : 'Donor needed';
    await this.notifications.notify(
      matches.map((m) => ({
        userId: m.user_id,
        type: 'request_alert' as const,
        title: overrides.title ?? `${urgency}: ${needLabel(request)}`,
        body:
          overrides.body ??
          `${request.hospital_name}, ${request.location_text}${m.distance_km !== null ? ` (${m.distance_km} km away)` : ''}. Tap to respond.`,
        data: { requestId: request.id },
      })),
    );
    return matches.length;
  }

  // ---------------------------------------------------------------------------
  // Helpers shared with appointments and admin
  // ---------------------------------------------------------------------------

  // Moves an active request between pending / matched / in_progress.
  async recomputeStatus(id: string) {
    const request = await this.getRow(id);
    if (!isActive(request.status)) return request.status;
    const [{ count: appointments }, accepted] = await Promise.all([
      this.supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('request_id', id)
        .in('status', ['requested', 'scheduled', 'completed']),
      this.acceptedDonorIds(id),
    ]);
    const next: RequestStatus =
      (appointments ?? 0) > 0
        ? 'in_progress'
        : accepted.length > 0
          ? 'matched'
          : 'pending';
    if (next !== request.status) {
      unwrap(
        await this.supabase
          .from('donation_requests')
          .update({
            status: next,
            matched_at:
              next !== 'pending' && !request.matched_at
                ? new Date().toISOString()
                : request.matched_at,
          })
          .eq('id', id),
        'requests.recompute',
      );
    }
    return next;
  }

  // Requester, the request's hospital admin, or a super admin.
  canManage(user: AuthUser, request: DonationRequestRow) {
    return (
      request.requester_id === user.id ||
      user.role === 'super_admin' ||
      (user.role === 'hospital_admin' &&
        user.hospitalId !== null &&
        request.hospital_id === user.hospitalId)
    );
  }

  isHospitalCoordinator(user: AuthUser, hospitalId: string | null) {
    return (
      user.role === 'super_admin' ||
      (user.role === 'hospital_admin' &&
        hospitalId !== null &&
        user.hospitalId === hospitalId)
    );
  }

  assertAdminFor(admin: AuthUser, request: DonationRequestRow) {
    if (!this.isHospitalCoordinator(admin, request.hospital_id)) {
      throw new ForbiddenException('This request belongs to another hospital');
    }
  }

  async getRow(id: string) {
    return unwrapOne(
      await this.supabase
        .from('donation_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle(),
      'requests.getRow',
      'Request not found',
    );
  }

  async logEvent(
    requestId: string,
    type: RequestEventType,
    actorId: string | null,
    message: string | null = null,
  ) {
    unwrap(
      await this.supabase
        .from('request_events')
        .insert({ request_id: requestId, type, actor_id: actorId, message }),
      'requests.logEvent',
    );
  }

  async acceptedCounts(requestIds: string[]) {
    const counts = new Map<string, number>();
    if (!requestIds.length) return counts;
    const rows = unwrap(
      await this.supabase
        .from('request_responses')
        .select('request_id')
        .in('request_id', requestIds)
        .eq('status', 'accepted'),
      'requests.acceptedCounts',
    );
    for (const row of rows) {
      counts.set(row.request_id, (counts.get(row.request_id) ?? 0) + 1);
    }
    return counts;
  }

  async acceptedDonorIds(requestId: string) {
    return unwrap(
      await this.supabase
        .from('request_responses')
        .select('donor_id')
        .eq('request_id', requestId)
        .eq('status', 'accepted'),
      'requests.acceptedDonors',
    ).map((r) => r.donor_id);
  }

  async userName(userId: string) {
    const user = unwrap(
      await this.supabase
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .maybeSingle(),
      'requests.userName',
    );
    return user?.name ?? 'A donor';
  }

  private async getActiveDonor(donorId: string) {
    const donor = unwrap(
      await this.supabase
        .from('users')
        .select('id, name, role, status, verification_status')
        .eq('id', donorId)
        .maybeSingle(),
      'requests.donor',
    );
    if (!donor || donor.role !== 'user' || donor.status !== 'active') {
      throw new NotFoundException('Donor not found');
    }
    return donor;
  }

  // Donors must be verified, compatible and past their recovery period.
  private async assertCanDonate(user: AuthUser, request: DonationRequestRow) {
    const [account, profile, stats] = await Promise.all([
      this.supabase
        .from('users')
        .select('verification_status, status')
        .eq('id', user.id)
        .single(),
      this.profiles.getProfileRow(user.id),
      this.profiles.getStats(user.id),
    ]);
    const acct = unwrap(account, 'requests.canDonate.account');
    if (acct.status !== 'active') {
      throw new ForbiddenException('Your account is suspended');
    }
    if (acct.verification_status !== 'verified') {
      throw new ForbiddenException(
        acct.verification_status === 'pending'
          ? 'Your identity verification is still under review. You can accept requests once it is approved.'
          : 'Verify your identity (upload an ID proof) before accepting requests.',
      );
    }
    if (request.request_type === 'blood') {
      if (!profile?.blood_group) {
        throw new BadRequestException(
          'Add your blood group to your profile first',
        );
      }
      if (!bloodCompatible(profile.blood_group, request.blood_group)) {
        throw new BadRequestException(
          `${profile.blood_group} blood can't be given to a ${request.blood_group} patient`,
        );
      }
      const eligibility = toStatsDto(stats);
      if (!eligibility.isEligible) {
        throw new ConflictException(
          `You can donate blood again from ${eligibility.nextEligibleOn}`,
        );
      }
    } else if (
      request.blood_group &&
      organNeedsAbo(request.organ_type) &&
      profile?.blood_group &&
      !bloodCompatible(profile.blood_group, request.blood_group, true)
    ) {
      throw new BadRequestException(
        `Your blood group isn't compatible with this ${request.organ_type} recipient`,
      );
    }
  }

  private async assertUnderActiveLimit(userId: string) {
    const { count } = await this.supabase
      .from('donation_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requester_id', userId)
      .in('status', ACTIVE_REQUEST_STATUSES);
    if ((count ?? 0) >= MAX_ACTIVE_REQUESTS_PER_USER) {
      throw new ConflictException(
        `You can have at most ${MAX_ACTIVE_REQUESTS_PER_USER} active requests. Close one before creating another.`,
      );
    }
  }

  private async assertOwnDocument(userId: string, documentId: string) {
    const doc = unwrap(
      await this.supabase
        .from('documents')
        .select('id')
        .eq('id', documentId)
        .eq('user_id', userId)
        .maybeSingle(),
      'requests.document',
    );
    if (!doc) throw new BadRequestException('Document not found');
  }

  // Accepted donors with contact details and their appointment (coordinators only).
  private async responders(requestId: string) {
    const responses = unwrap(
      await this.supabase
        .from('request_responses')
        .select('donor_id, message, updated_at, assigned_by')
        .eq('request_id', requestId)
        .eq('status', 'accepted')
        .order('updated_at'),
      'requests.responders',
    );
    if (!responses.length) return [];
    const ids = responses.map((r) => r.donor_id);
    const [users, profiles, appointments, ratings] = await Promise.all([
      this.supabase
        .from('users')
        .select('id, name, email, verification_status')
        .in('id', ids),
      this.supabase
        .from('profiles')
        .select('user_id, phone, blood_group, city')
        .in('user_id', ids),
      this.supabase
        .from('appointments')
        .select('*')
        .eq('request_id', requestId)
        .in('donor_id', ids)
        .order('created_at', { ascending: false }),
      this.supabase.client.from('donor_ratings').select('*').in('user_id', ids),
    ]);
    const userById = new Map(
      unwrap(users, 'requests.responders.users').map((u) => [u.id, u]),
    );
    const profileById = new Map(
      unwrap(profiles, 'requests.responders.profiles').map((p) => [
        p.user_id,
        p,
      ]),
    );
    const ratingById = new Map(
      unwrap(ratings, 'requests.responders.ratings').map((r) => [r.user_id, r]),
    );
    const appointmentByDonor = new Map<string, AppointmentRow>();
    for (const a of unwrap(appointments, 'requests.responders.appointments')) {
      if (!appointmentByDonor.has(a.donor_id))
        appointmentByDonor.set(a.donor_id, a);
    }
    return responses.map((r) => {
      const rating = ratingById.get(r.donor_id);
      return {
        donorId: r.donor_id,
        name: userById.get(r.donor_id)?.name ?? null,
        email: userById.get(r.donor_id)?.email ?? null,
        verified: userById.get(r.donor_id)?.verification_status === 'verified',
        phone: profileById.get(r.donor_id)?.phone ?? null,
        bloodGroup: profileById.get(r.donor_id)?.blood_group ?? null,
        city: profileById.get(r.donor_id)?.city ?? null,
        avgRating:
          rating?.avg_rating === null || !rating
            ? null
            : Number(rating.avg_rating),
        message: r.message,
        assigned: r.assigned_by !== null,
        respondedAt: r.updated_at,
        appointment: toAppointmentDto(
          appointmentByDonor.get(r.donor_id) ?? null,
        ),
      };
    });
  }

  private async timeline(requestId: string) {
    const events = unwrap(
      await this.supabase
        .from('request_events')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at'),
      'requests.timeline',
    );
    return events.map((e) => ({
      type: e.type,
      message: e.message,
      at: e.created_at,
    }));
  }
}

function canDonateTo(
  profile: { blood_group: DonationRequestRow['blood_group'] } | null,
  request: DonationRequestRow,
) {
  if (!profile?.blood_group) return false;
  if (request.request_type === 'blood') {
    return bloodCompatible(profile.blood_group, request.blood_group);
  }
  return (
    !request.blood_group ||
    !organNeedsAbo(request.organ_type) ||
    bloodCompatible(profile.blood_group, request.blood_group, true)
  );
}

export function needLabel(r: {
  request_type: string;
  blood_group: string | null;
  organ_type: string | null;
  units_required: number | null;
}) {
  return r.request_type === 'blood'
    ? `${r.blood_group} blood (${r.units_required} unit${r.units_required === 1 ? '' : 's'})`
    : `${(r.organ_type ?? 'organ').replace('_', ' ')} donor`;
}

export function toRequestDto(r: DonationRequestRow) {
  return {
    id: r.id,
    requesterId: r.requester_id,
    hospitalId: r.hospital_id,
    hospitalName: r.hospital_name,
    patientName: r.patient_name,
    patientAge: r.patient_age,
    patientGender: r.patient_gender,
    requestType: r.request_type,
    bloodGroup: r.blood_group,
    organType: r.organ_type,
    unitsRequired: r.units_required,
    priority: r.priority,
    status: r.status,
    contactPhone: r.contact_phone as string | null,
    locationText: r.location_text,
    city: r.city,
    latitude: r.latitude,
    longitude: r.longitude,
    neededBy: r.needed_by,
    notes: r.notes,
    isVerified: r.is_verified,
    flagged: r.flagged,
    documentId: r.document_id,
    matchedAt: r.matched_at,
    completedAt: r.completed_at,
    closeReason: r.close_reason,
    createdAt: r.created_at,
  };
}

function toOpenRequestDto(r: OpenRequestRow) {
  return {
    id: r.id,
    requesterId: r.requester_id,
    hospitalId: r.hospital_id,
    hospitalName: r.hospital_name,
    patientName: r.patient_name,
    patientAge: r.patient_age,
    patientGender: r.patient_gender,
    requestType: r.request_type,
    bloodGroup: r.blood_group,
    organType: r.organ_type,
    unitsRequired: r.units_required,
    priority: r.priority,
    status: r.status,
    // Contact is revealed on the detail view once the donor accepts.
    contactPhone: null,
    locationText: r.location_text,
    city: r.city,
    latitude: r.latitude,
    longitude: r.longitude,
    neededBy: r.needed_by,
    notes: r.notes,
    isVerified: r.is_verified,
    createdAt: r.created_at,
    distanceKm: roundKm(r.distance_km),
    myResponse: r.my_response,
    acceptedCount: r.accepted_count,
    canDonate: r.can_donate,
  };
}

export function toAppointmentDto(a: AppointmentRow | null) {
  if (!a) return null;
  return {
    id: a.id,
    donorId: a.donor_id,
    requestId: a.request_id,
    hospitalId: a.hospital_id,
    hospitalName: a.hospital_name,
    scheduledAt: a.scheduled_at,
    locationText: a.location_text,
    instructions: a.instructions,
    donationType: a.donation_type,
    status: a.status,
    donorNote: a.donor_note,
    cancelReason: a.cancel_reason,
    donationId: a.donation_id,
    completedAt: a.completed_at,
    createdAt: a.created_at,
  };
}
