import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { HospitalsService } from '../hospitals/hospitals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DonationsService } from '../donations/donations.service';
import { ProfileService, toStatsDto } from '../profile/profile.service';
import {
  RequestsService,
  isActive,
  needLabel,
  toAppointmentDto,
} from '../requests/requests.service';
import { ScheduleAppointmentDto } from '../requests/dto/requests.dto';
import { unwrap, unwrapOne } from '../../common/db';
import { formatWhen, todayIst } from '../../common/dates';
import { hospitalScope, type AuthUser } from '../auth/auth.types';
import type {
  AppointmentRow,
  DonationRequestRow,
} from '../../types/database.types';
import {
  AppointmentsQueryDto,
  BookAppointmentDto,
  CompleteAppointmentDto,
  UpdateAppointmentDto,
} from './appointments.dto';

const MAX_DAYS_AHEAD = 180;
const ACTIVE = ['requested', 'scheduled'] as const;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly hospitals: HospitalsService,
    private readonly notifications: NotificationsService,
    private readonly requests: RequestsService,
    private readonly donations: DonationsService,
    private readonly profiles: ProfileService,
  ) {}

  // Requester / hospital schedules a donor who accepted the request.
  async scheduleForRequest(
    actor: AuthUser,
    requestId: string,
    dto: ScheduleAppointmentDto,
  ) {
    const request = await this.requests.getRow(requestId);
    if (!this.requests.canManage(actor, request)) {
      throw new ForbiddenException('You cannot schedule for this request');
    }
    if (!isActive(request.status)) {
      throw new ConflictException('This request is no longer open');
    }
    assertFutureTime(dto.scheduledAt);
    const accepted = await this.requests.acceptedDonorIds(requestId);
    if (!accepted.includes(dto.donorId)) {
      throw new BadRequestException(
        'Only donors who accepted this request can be scheduled',
      );
    }
    const existing = unwrap(
      await this.supabase
        .from('appointments')
        .select('id')
        .eq('request_id', requestId)
        .eq('donor_id', dto.donorId)
        .in('status', ACTIVE)
        .maybeSingle(),
      'appointments.schedule.existing',
    );
    if (existing) {
      throw new ConflictException(
        'This donor already has an appointment. Reschedule it instead.',
      );
    }

    const row = unwrap(
      await this.supabase
        .from('appointments')
        .insert({
          donor_id: dto.donorId,
          request_id: requestId,
          hospital_id: request.hospital_id,
          hospital_name: request.hospital_name,
          scheduled_at: dto.scheduledAt,
          location_text: dto.locationText ?? request.location_text,
          instructions: dto.instructions ?? null,
          donation_type:
            dto.donationType ??
            (request.request_type === 'organ' ? 'organ' : 'whole_blood'),
          status: 'scheduled',
          created_by: actor.id,
        })
        .select('*')
        .single(),
      'appointments.schedule',
    );
    await this.requests.logEvent(
      requestId,
      'appointment_scheduled',
      actor.id,
      await this.requests.userName(dto.donorId),
    );
    await this.notifications.notify([
      {
        userId: dto.donorId,
        type: 'appointment',
        title: 'Donation appointment scheduled',
        body: `${request.hospital_name} on ${formatWhen(row.scheduled_at)}. Open the request for directions and instructions.`,
        data: { appointmentId: row.id, requestId },
      },
    ]);
    if (actor.id !== request.requester_id) {
      await this.notifications.notify([
        {
          userId: request.requester_id,
          type: 'request_update',
          title: 'Donation scheduled',
          body: `A donor will donate for ${request.patient_name} on ${formatWhen(row.scheduled_at)}.`,
          data: { requestId },
        },
      ]);
    }
    await this.requests.recomputeStatus(requestId);
    return toAppointmentDto(row);
  }

  // A donor asks a registered hospital for a slot (hospital confirms).
  async book(donor: AuthUser, dto: BookAppointmentDto) {
    if (donor.role !== 'user') {
      throw new ForbiddenException('Only donors can book appointments');
    }
    assertFutureTime(dto.scheduledAt);
    const hospital = await this.hospitals.getRow(dto.hospitalId);
    const donationType = dto.donationType ?? 'whole_blood';
    if (donationType !== 'organ') {
      const stats = toStatsDto(await this.profiles.getStats(donor.id));
      if (
        stats.nextEligibleOn &&
        stats.nextEligibleOn > dto.scheduledAt.slice(0, 10)
      ) {
        throw new ConflictException(
          `You can donate again from ${stats.nextEligibleOn}. Pick a later date.`,
        );
      }
    }
    const open = unwrap(
      await this.supabase
        .from('appointments')
        .select('id')
        .eq('donor_id', donor.id)
        .eq('hospital_id', hospital.id)
        .is('request_id', null)
        .in('status', ACTIVE),
      'appointments.book.open',
    );
    if (open.length) {
      throw new ConflictException(
        'You already have an upcoming appointment at this hospital',
      );
    }
    const row = unwrap(
      await this.supabase
        .from('appointments')
        .insert({
          donor_id: donor.id,
          hospital_id: hospital.id,
          hospital_name: hospital.name,
          scheduled_at: dto.scheduledAt,
          location_text: hospital.address,
          donation_type: donationType,
          status: 'requested',
          donor_note: dto.note ?? null,
          created_by: donor.id,
        })
        .select('*')
        .single(),
      'appointments.book',
    );
    await this.notifications.notifyHospitalAdmins(hospital.id, {
      type: 'appointment',
      title: 'New donation appointment request',
      body: `${await this.requests.userName(donor.id)} would like to donate on ${formatWhen(row.scheduled_at)}. Confirm or propose another time.`,
      data: { appointmentId: row.id },
    });
    return toAppointmentDto(row);
  }

  async listMine(userId: string, query: AppointmentsQueryDto) {
    let builder = this.supabase
      .from('appointments')
      .select('*')
      .eq('donor_id', userId);
    builder = applyStatusFilter(builder, query.status);
    const rows = unwrap(
      await builder
        .order('scheduled_at', { ascending: query.status === 'upcoming' })
        .range(query.offset, query.offset + query.limit - 1),
      'appointments.listMine',
    );
    return this.enrich(rows, false);
  }

  async listForHospital(admin: AuthUser, query: AppointmentsQueryDto) {
    const scope = hospitalScope(admin);
    let builder = this.supabase.from('appointments').select('*');
    if (scope) builder = builder.eq('hospital_id', scope);
    builder = applyStatusFilter(builder, query.status);
    const rows = unwrap(
      await builder
        .order('scheduled_at', {
          ascending:
            query.status === 'upcoming' || query.status === 'requested',
        })
        .range(query.offset, query.offset + query.limit - 1),
      'appointments.listForHospital',
    );
    return this.enrich(rows, true);
  }

  async get(viewer: AuthUser, id: string) {
    const { appointment, request } = await this.load(id);
    if (
      appointment.donor_id !== viewer.id &&
      !this.canCoordinate(viewer, appointment, request)
    ) {
      throw new ForbiddenException('You cannot view this appointment');
    }
    return (await this.enrich([appointment], true))[0];
  }

  // Confirms a requested slot or reschedules / adds details.
  async update(actor: AuthUser, id: string, dto: UpdateAppointmentDto) {
    const { appointment, request } = await this.load(id);
    if (!this.canCoordinate(actor, appointment, request)) {
      throw new ForbiddenException('You cannot change this appointment');
    }
    if (!ACTIVE.includes(appointment.status as (typeof ACTIVE)[number])) {
      throw new ConflictException(`Appointment is ${appointment.status}`);
    }
    if (dto.scheduledAt) assertFutureTime(dto.scheduledAt);
    const confirming = appointment.status === 'requested';
    const rescheduled =
      dto.scheduledAt !== undefined &&
      new Date(dto.scheduledAt).getTime() !==
        new Date(appointment.scheduled_at).getTime();

    const row = unwrap(
      await this.supabase
        .from('appointments')
        .update({
          status: 'scheduled',
          scheduled_at: dto.scheduledAt ?? appointment.scheduled_at,
          location_text:
            dto.locationText !== undefined
              ? dto.locationText
              : appointment.location_text,
          instructions:
            dto.instructions !== undefined
              ? dto.instructions
              : appointment.instructions,
          // A new time deserves a fresh reminder.
          reminder_sent_at: rescheduled ? null : appointment.reminder_sent_at,
        })
        .eq('id', id)
        .select('*')
        .single(),
      'appointments.update',
    );
    await this.notifications.notify([
      {
        userId: appointment.donor_id,
        type: 'appointment',
        title: confirming
          ? 'Appointment confirmed'
          : rescheduled
            ? 'Appointment rescheduled'
            : 'Appointment details updated',
        body: `${row.hospital_name}, ${formatWhen(row.scheduled_at)}${row.location_text ? ` · ${row.location_text}` : ''}`,
        data: { appointmentId: id, requestId: row.request_id },
      },
    ]);
    return toAppointmentDto(row);
  }

  async cancel(actor: AuthUser, id: string, reason: string | null) {
    const { appointment, request } = await this.load(id);
    const isDonor = appointment.donor_id === actor.id;
    if (!isDonor && !this.canCoordinate(actor, appointment, request)) {
      throw new ForbiddenException('You cannot cancel this appointment');
    }
    if (!ACTIVE.includes(appointment.status as (typeof ACTIVE)[number])) {
      throw new ConflictException(`Appointment is ${appointment.status}`);
    }
    const row = unwrap(
      await this.supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancelled_by: actor.id,
          cancel_reason: reason,
        })
        .eq('id', id)
        .select('*')
        .single(),
      'appointments.cancel',
    );
    const message = `${formatWhen(appointment.scheduled_at)} at ${appointment.hospital_name}${reason ? `: ${reason}` : ''}`;
    if (isDonor) {
      const name = await this.requests.userName(actor.id);
      const notification = {
        type: 'appointment' as const,
        title: `${name} cancelled their appointment`,
        body: message,
        data: { appointmentId: id, requestId: appointment.request_id },
      };
      if (request) {
        await this.notifications.notify([
          { ...notification, userId: request.requester_id },
        ]);
      }
      await this.notifications.notifyHospitalAdmins(
        appointment.hospital_id,
        notification,
        request?.requester_id,
      );
    } else {
      await this.notifications.notify([
        {
          userId: appointment.donor_id,
          type: 'appointment',
          title: 'Your appointment was cancelled',
          body: message,
          data: { appointmentId: id, requestId: appointment.request_id },
        },
      ]);
    }
    if (request) {
      await this.requests.logEvent(
        request.id,
        'appointment_cancelled',
        actor.id,
        reason,
      );
      await this.requests.recomputeStatus(request.id);
    }
    return toAppointmentDto(row);
  }

  // Records the donation. Hospital staff produce a verified donation (points +
  // certificate); a requester's confirmation stays pending hospital review.
  async complete(actor: AuthUser, id: string, dto: CompleteAppointmentDto) {
    const { appointment, request } = await this.load(id);
    if (!this.canCoordinate(actor, appointment, request)) {
      throw new ForbiddenException('You cannot complete this appointment');
    }
    if (appointment.status !== 'scheduled') {
      throw new ConflictException(
        appointment.status === 'requested'
          ? 'Confirm the appointment first'
          : `Appointment is ${appointment.status}`,
      );
    }
    if (
      new Date(appointment.scheduled_at).getTime() >
      Date.now() + 12 * 3600e3
    ) {
      throw new BadRequestException(
        'An appointment can only be completed on or after its date',
      );
    }
    const verifiedBy = this.requests.isHospitalCoordinator(
      actor,
      appointment.hospital_id,
    )
      ? actor.id
      : null;
    const units = appointment.donation_type === 'organ' ? 1 : (dto.units ?? 1);
    const donation = await this.donations.insert(
      appointment.donor_id,
      {
        donationType: appointment.donation_type,
        units,
        donatedOn: todayIst(),
        hospitalId: appointment.hospital_id ?? undefined,
        hospitalName: appointment.hospital_name,
        requestId: appointment.request_id ?? undefined,
        notes: dto.notes ?? undefined,
      },
      verifiedBy,
    );
    const row = unwrap(
      await this.supabase
        .from('appointments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          donation_id: donation.id,
        })
        .eq('id', id)
        .select('*')
        .single(),
      'appointments.complete',
    );
    await this.notifications.notify([
      {
        userId: appointment.donor_id,
        type: verifiedBy ? 'donation_verified' : 'appointment',
        title: 'Thank you for donating!',
        body: verifiedBy
          ? `${appointment.hospital_name} recorded your donation. Your certificate and points are ready.`
          : `Your donation was recorded. It will count towards points and a certificate once ${appointment.hospital_name} verifies it.`,
        data: { donationId: donation.id, requestId: appointment.request_id },
      },
    ]);

    if (request && isActive(request.status)) {
      await this.requests.logEvent(
        request.id,
        'donation_completed',
        actor.id,
        await this.requests.userName(appointment.donor_id),
      );
      if (await this.isFulfilled(request)) {
        await this.requests.close(
          await this.requests.getRow(request.id),
          'completed',
          actor.id,
          null,
        );
      } else {
        await this.requests.recomputeStatus(request.id);
        await this.notifications.notify([
          {
            userId: request.requester_id,
            type: 'request_update',
            title: 'A donation was completed',
            body: `${needLabel(request)} — more units are still needed.`,
            data: { requestId: request.id },
          },
        ]);
      }
    }
    return toAppointmentDto(row);
  }

  async noShow(actor: AuthUser, id: string) {
    const { appointment, request } = await this.load(id);
    if (!this.canCoordinate(actor, appointment, request)) {
      throw new ForbiddenException('You cannot update this appointment');
    }
    if (appointment.status !== 'scheduled') {
      throw new ConflictException(`Appointment is ${appointment.status}`);
    }
    const row = unwrap(
      await this.supabase
        .from('appointments')
        .update({ status: 'no_show', cancelled_by: actor.id })
        .eq('id', id)
        .select('*')
        .single(),
      'appointments.noShow',
    );
    await this.notifications.notify([
      {
        userId: appointment.donor_id,
        type: 'appointment',
        title: 'Missed appointment',
        body: `You were marked as not attending on ${formatWhen(appointment.scheduled_at)}. If this is a mistake, contact ${appointment.hospital_name}.`,
        data: { appointmentId: id },
      },
    ]);
    if (request) {
      await this.requests.logEvent(
        request.id,
        'appointment_cancelled',
        actor.id,
        'Donor did not attend',
      );
      await this.requests.recomputeStatus(request.id);
    }
    return toAppointmentDto(row);
  }

  // ---------------------------------------------------------------------------

  private canCoordinate(
    actor: AuthUser,
    appointment: AppointmentRow,
    request: DonationRequestRow | null,
  ) {
    return (
      this.requests.isHospitalCoordinator(actor, appointment.hospital_id) ||
      (request !== null && request.requester_id === actor.id)
    );
  }

  private async load(id: string) {
    const appointment = unwrapOne(
      await this.supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .maybeSingle(),
      'appointments.load',
      'Appointment not found',
    );
    const request = appointment.request_id
      ? await this.requests.getRow(appointment.request_id)
      : null;
    return { appointment, request };
  }

  private async isFulfilled(request: DonationRequestRow) {
    if (request.request_type === 'organ') return true;
    const donations = unwrap(
      await this.supabase
        .from('donations')
        .select('units')
        .eq('request_id', request.id),
      'appointments.isFulfilled',
    );
    const total = donations.reduce((sum, d) => sum + d.units, 0);
    return total >= (request.units_required ?? 1);
  }

  // Adds the donor and request summary for list views.
  private async enrich(rows: AppointmentRow[], includeDonor: boolean) {
    if (!rows.length) return [];
    const requestIds = [
      ...new Set(rows.map((r) => r.request_id).filter((x): x is string => !!x)),
    ];
    const donorIds = includeDonor
      ? [...new Set(rows.map((r) => r.donor_id))]
      : [];
    const [requests, users, profiles] = await Promise.all([
      this.supabase
        .from('donation_requests')
        .select(
          'id, patient_name, request_type, blood_group, organ_type, units_required, status',
        )
        .in('id', requestIds),
      this.supabase.from('users').select('id, name, email').in('id', donorIds),
      this.supabase
        .from('profiles')
        .select('user_id, phone, blood_group')
        .in('user_id', donorIds),
    ]);
    const requestById = new Map(
      unwrap(requests, 'appointments.enrich.requests').map((r) => [r.id, r]),
    );
    const userById = new Map(
      unwrap(users, 'appointments.enrich.users').map((u) => [u.id, u]),
    );
    const profileById = new Map(
      unwrap(profiles, 'appointments.enrich.profiles').map((p) => [
        p.user_id,
        p,
      ]),
    );
    return rows.map((a) => {
      const r = a.request_id ? requestById.get(a.request_id) : undefined;
      const u = userById.get(a.donor_id);
      const p = profileById.get(a.donor_id);
      return {
        ...toAppointmentDto(a)!,
        request: r
          ? {
              id: r.id,
              patientName: r.patient_name,
              need: needLabel(r),
              status: r.status,
            }
          : null,
        donor: includeDonor
          ? {
              id: a.donor_id,
              name: u?.name ?? null,
              email: u?.email ?? null,
              phone: p?.phone ?? null,
              bloodGroup: p?.blood_group ?? null,
            }
          : undefined,
      };
    });
  }
}

type Filterable<T> = {
  in(column: 'status', values: readonly string[]): T;
  eq(column: 'status', value: string): T;
  gte(column: 'scheduled_at', value: string): T;
};

function applyStatusFilter<T extends Filterable<T>>(
  builder: T,
  status: AppointmentsQueryDto['status'],
): T {
  if (status === 'upcoming') {
    return builder
      .in('status', ACTIVE)
      .gte('scheduled_at', new Date(Date.now() - 6 * 3600e3).toISOString());
  }
  return status ? builder.eq('status', status) : builder;
}

function assertFutureTime(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t) || t < Date.now() - 5 * 60e3) {
    throw new BadRequestException('Pick a time in the future');
  }
  if (t > Date.now() + MAX_DAYS_AHEAD * 86400e3) {
    throw new BadRequestException(
      `Appointments can be at most ${MAX_DAYS_AHEAD} days ahead`,
    );
  }
}
