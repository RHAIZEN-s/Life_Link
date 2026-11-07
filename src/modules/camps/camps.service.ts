import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { HospitalsService } from '../hospitals/hospitals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { unwrap, unwrapOne, assertOk } from '../../common/db';
import {
  geoArgs,
  roundKm,
  type GeoPaginationQueryDto,
} from '../../common/query.dto';
import type { CampRow, UpcomingCampRow } from '../../types/database.types';
import {
  hospitalScope,
  scopedHospitalFor,
  type AuthUser,
} from '../auth/auth.types';
import { formatWhen } from '../../common/dates';
import { CreateCampDto, UpdateCampDto } from './dto/camps.dto';

@Injectable()
export class CampsService {
  private readonly logger = new Logger(CampsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly hospitals: HospitalsService,
    private readonly notifications: NotificationsService,
  ) {}

  async listUpcoming(viewerId: string, query: GeoPaginationQueryDto) {
    const rows = unwrap(
      await this.supabase.client.rpc('list_upcoming_camps', {
        p_viewer: viewerId,
        ...geoArgs(query),
      }),
      'camps.listUpcoming',
    );
    return rows.map(toUpcomingDto);
  }

  async get(viewerId: string, id: string) {
    const camp = await this.getRow(id);
    const [count, mine] = await Promise.all([
      this.registrationCount(id),
      this.supabase
        .from('camp_registrations')
        .select('camp_id')
        .eq('camp_id', id)
        .eq('user_id', viewerId)
        .maybeSingle(),
    ]);
    return {
      ...toCampDto(camp),
      registeredCount: count,
      isRegistered: unwrap(mine, 'camps.get.mine') !== null,
    };
  }

  async register(userId: string, id: string) {
    const camp = await this.getRow(id);
    if (camp.status !== 'scheduled' || new Date(camp.ends_at) < new Date()) {
      throw new ConflictException('Registration for this camp is closed');
    }
    if (
      camp.capacity !== null &&
      (await this.registrationCount(id)) >= camp.capacity
    ) {
      throw new ConflictException('This camp is full');
    }
    // Idempotent: registering twice is not an error.
    unwrap(
      await this.supabase
        .from('camp_registrations')
        .upsert(
          { camp_id: id, user_id: userId },
          { onConflict: 'camp_id,user_id', ignoreDuplicates: true },
        ),
      'camps.register',
    );
    return this.get(userId, id);
  }

  async unregister(userId: string, id: string) {
    unwrap(
      await this.supabase
        .from('camp_registrations')
        .delete()
        .eq('camp_id', id)
        .eq('user_id', userId),
      'camps.unregister',
    );
    return this.get(userId, id);
  }

  async myRegistrations(userId: string) {
    const regs = unwrap(
      await this.supabase
        .from('camp_registrations')
        .select('camp_id')
        .eq('user_id', userId),
      'camps.myRegistrations',
    );
    if (!regs.length) return [];
    const camps = unwrap(
      await this.supabase
        .from('camps')
        .select('*')
        .in(
          'id',
          regs.map((r) => r.camp_id),
        )
        .order('starts_at', { ascending: false }),
      'camps.myRegistrations.camps',
    );
    return camps.map((c) => ({ ...toCampDto(c), isRegistered: true }));
  }

  // --- Hospital admin ---

  async listForHospital(admin: AuthUser) {
    const scope = hospitalScope(admin);
    let builder = this.supabase
      .from('camps')
      .select('*')
      .order('starts_at', { ascending: false })
      .limit(200);
    if (scope) builder = builder.eq('hospital_id', scope);
    const camps = unwrap(await builder, 'camps.listForHospital');
    const counts = await this.registrationCounts(camps.map((c) => c.id));
    return camps.map((c) => ({
      ...toCampDto(c),
      registeredCount: counts.get(c.id) ?? 0,
    }));
  }

  async create(admin: AuthUser, dto: CreateCampDto) {
    const hospitalId = scopedHospitalFor(admin, dto.hospitalId);
    assertTimes(dto.startsAt, dto.endsAt);
    if (new Date(dto.startsAt) < new Date()) {
      throw new BadRequestException('startsAt must be in the future');
    }
    const hospital = await this.hospitals.getRow(hospitalId);
    const row = unwrap(
      await this.supabase
        .from('camps')
        .insert({
          hospital_id: hospitalId,
          organizer_name: hospital.name,
          title: dto.title,
          description: dto.description ?? null,
          address: dto.address,
          city: dto.city ?? hospital.city,
          latitude: dto.latitude ?? hospital.latitude,
          longitude: dto.longitude ?? hospital.longitude,
          starts_at: dto.startsAt,
          ends_at: dto.endsAt,
          capacity: dto.capacity ?? null,
          created_by: admin.id,
        })
        .select('*')
        .single(),
      'camps.create',
    );
    await this.notifyNearby(row).catch((err: unknown) =>
      this.logger.error(
        `Camp notification for ${row.id} failed`,
        err instanceof Error ? err.stack : String(err),
      ),
    );
    return { ...toCampDto(row), registeredCount: 0 };
  }

  // Tells opted-in users within 25 km (or in the same city) about a new camp.
  private async notifyNearby(camp: CampRow) {
    const users = unwrap(
      await this.supabase.client.rpc('users_near', {
        p_lat: camp.latitude,
        p_lng: camp.longitude,
        p_radius_km: 25,
        p_city: camp.city,
      }),
      'camps.notifyNearby',
    );
    await this.notifications.notify(
      users.map((u) => ({
        userId: u.user_id,
        type: 'camp' as const,
        title: `Blood camp near you: ${camp.title}`,
        body: `${formatWhen(camp.starts_at)} at ${camp.address}. Register in the app.`,
        data: { campId: camp.id },
      })),
    );
  }

  async update(admin: AuthUser, id: string, dto: UpdateCampDto) {
    const camp = await this.getManaged(admin, id);
    const startsAt = dto.startsAt ?? camp.starts_at;
    const endsAt = dto.endsAt ?? camp.ends_at;
    assertTimes(startsAt, endsAt);

    const row = unwrap(
      await this.supabase
        .from('camps')
        .update({
          title: dto.title,
          description: dto.description,
          address: dto.address,
          city: dto.city,
          latitude: dto.latitude,
          longitude: dto.longitude,
          starts_at: dto.startsAt,
          ends_at: dto.endsAt,
          capacity: dto.capacity,
          status: dto.status,
        })
        .eq('id', id)
        .select('*')
        .single(),
      'camps.update',
    );

    if (dto.status === 'cancelled' && camp.status !== 'cancelled') {
      const regs = unwrap(
        await this.supabase
          .from('camp_registrations')
          .select('user_id')
          .eq('camp_id', id),
        'camps.update.registrations',
      );
      await this.notifications.notify(
        regs.map((r) => ({
          userId: r.user_id,
          type: 'camp' as const,
          title: 'Blood camp cancelled',
          body: `"${camp.title}" has been cancelled. We're sorry for the inconvenience.`,
          data: { campId: id },
        })),
      );
    }
    return {
      ...toCampDto(row),
      registeredCount: await this.registrationCount(id),
    };
  }

  async registrations(admin: AuthUser, id: string) {
    await this.getManaged(admin, id);
    const regs = unwrap(
      await this.supabase
        .from('camp_registrations')
        .select('user_id, created_at')
        .eq('camp_id', id)
        .order('created_at'),
      'camps.registrations',
    );
    if (!regs.length) return [];
    const ids = regs.map((r) => r.user_id);
    const [users, profiles] = await Promise.all([
      this.supabase.from('users').select('id, name, email').in('id', ids),
      this.supabase
        .from('profiles')
        .select('user_id, phone, blood_group')
        .in('user_id', ids),
    ]);
    const userById = new Map(
      unwrap(users, 'camps.registrations.users').map((u) => [u.id, u]),
    );
    const profileById = new Map(
      unwrap(profiles, 'camps.registrations.profiles').map((p) => [
        p.user_id,
        p,
      ]),
    );
    return regs.map((r) => ({
      userId: r.user_id,
      name: userById.get(r.user_id)?.name ?? null,
      email: userById.get(r.user_id)?.email ?? null,
      phone: profileById.get(r.user_id)?.phone ?? null,
      bloodGroup: profileById.get(r.user_id)?.blood_group ?? null,
      registeredAt: r.created_at,
    }));
  }

  private async getManaged(admin: AuthUser, id: string) {
    const camp = await this.getRow(id);
    if (admin.role !== 'super_admin' && camp.hospital_id !== admin.hospitalId) {
      throw new ForbiddenException('This camp belongs to another hospital');
    }
    return camp;
  }

  private async getRow(id: string) {
    return unwrapOne(
      await this.supabase.from('camps').select('*').eq('id', id).maybeSingle(),
      'camps.get',
      'Camp not found',
    );
  }

  private async registrationCount(id: string) {
    const { count, error } = await this.supabase
      .from('camp_registrations')
      .select('camp_id', { count: 'exact', head: true })
      .eq('camp_id', id);
    assertOk(error, 'camps.registrationCount');
    return count ?? 0;
  }

  private async registrationCounts(ids: string[]) {
    const counts = new Map<string, number>();
    if (!ids.length) return counts;
    const rows = unwrap(
      await this.supabase
        .from('camp_registrations')
        .select('camp_id')
        .in('camp_id', ids),
      'camps.registrationCounts',
    );
    for (const r of rows)
      counts.set(r.camp_id, (counts.get(r.camp_id) ?? 0) + 1);
    return counts;
  }
}

function assertTimes(startsAt: string, endsAt: string) {
  if (new Date(endsAt) <= new Date(startsAt)) {
    throw new BadRequestException('endsAt must be after startsAt');
  }
}

export function toCampDto(c: CampRow) {
  return {
    id: c.id,
    hospitalId: c.hospital_id,
    organizerName: c.organizer_name,
    title: c.title,
    description: c.description,
    address: c.address,
    city: c.city,
    latitude: c.latitude,
    longitude: c.longitude,
    startsAt: c.starts_at,
    endsAt: c.ends_at,
    capacity: c.capacity,
    status: c.status,
  };
}

function toUpcomingDto(c: UpcomingCampRow) {
  return {
    id: c.id,
    hospitalId: c.hospital_id,
    organizerName: c.organizer_name,
    title: c.title,
    description: c.description,
    address: c.address,
    city: c.city,
    latitude: c.latitude,
    longitude: c.longitude,
    startsAt: c.starts_at,
    endsAt: c.ends_at,
    capacity: c.capacity,
    status: 'scheduled' as const,
    registeredCount: c.registered_count,
    isRegistered: c.is_registered,
    distanceKm: roundKm(c.distance_km),
  };
}
