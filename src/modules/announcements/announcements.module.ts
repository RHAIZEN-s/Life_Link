import {
  BadRequestException,
  Controller,
  Get,
  Global,
  Injectable,
  Module,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SupabaseService } from '../supabase/supabase.service';
import { ProfileService } from '../profile/profile.service';
import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { unwrap, unwrapOne } from '../../common/db';
import { Trim, TrimToNull } from '../../common/validators';
import type { AnnouncementRow, Audience } from '../../types/database.types';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'World Blood Donor Day drive' })
  @Trim()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'Join us at City Hall on 14 June, 9am–5pm.' })
  @Trim()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  body: string;

  @ApiPropertyOptional({
    enum: ['all', 'donors', 'recipients'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'donors', 'recipients'])
  audience?: Audience;

  @ApiPropertyOptional({
    example: 'Pune',
    description: 'Limit to one city; empty = everywhere.',
  })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Defaults to now.' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiProperty({ example: '2026-11-30T23:59:00+05:30' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Also send it as a notification to the audience.',
  })
  @IsOptional()
  @IsBoolean()
  notify?: boolean;
}

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly profiles: ProfileService,
  ) {}

  // Active banners for the signed-in user.
  async activeFor(userId: string) {
    const profile = await this.profiles.getProfileRow(userId);
    const nowIso = new Date().toISOString();
    const rows = unwrap(
      await this.supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .lte('starts_at', nowIso)
        .gt('ends_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(20),
      'announcements.active',
    );
    const role = profile?.registered_as;
    return rows
      .filter(
        (a) =>
          (a.audience === 'all' ||
            (a.audience === 'donors' && role === 'donor') ||
            (a.audience === 'recipients' && role === 'recipient')) &&
          (!a.city ||
            (profile?.city ?? '').toLowerCase() === a.city.toLowerCase()),
      )
      .slice(0, 5)
      .map(toDto);
  }

  async listForAdmin(admin: AuthUser) {
    let builder = this.supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (admin.role !== 'super_admin') {
      builder = builder.eq('hospital_id', admin.hospitalId ?? '');
    }
    return unwrap(await builder, 'announcements.listForAdmin').map(toDto);
  }

  async create(admin: AuthUser, dto: CreateAnnouncementDto) {
    const startsAt = dto.startsAt ?? new Date().toISOString();
    if (new Date(dto.endsAt) <= new Date(startsAt)) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    const row = unwrap(
      await this.supabase
        .from('announcements')
        .insert({
          hospital_id: admin.role === 'super_admin' ? null : admin.hospitalId,
          created_by: admin.id,
          title: dto.title,
          body: dto.body,
          audience: dto.audience ?? 'all',
          city: dto.city ?? null,
          starts_at: startsAt,
          ends_at: dto.endsAt,
        })
        .select('*')
        .single(),
      'announcements.create',
    );
    let notified = 0;
    if (dto.notify) {
      notified = unwrap(
        await this.supabase.client.rpc('broadcast_announcement', {
          p_announcement: row.id,
        }),
        'announcements.broadcast',
      );
    }
    return { ...toDto(row), notified };
  }

  async deactivate(admin: AuthUser, id: string) {
    let builder = this.supabase
      .from('announcements')
      .update({ is_active: false })
      .eq('id', id);
    if (admin.role !== 'super_admin') {
      builder = builder.eq('hospital_id', admin.hospitalId ?? '');
    }
    unwrapOne(
      await builder.select('id').maybeSingle(),
      'announcements.deactivate',
      'Announcement not found',
    );
    return { ok: true };
  }
}

function toDto(a: AnnouncementRow) {
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    audience: a.audience,
    city: a.city,
    startsAt: a.starts_at,
    endsAt: a.ends_at,
    isActive: a.is_active,
    createdAt: a.created_at,
  };
}

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  @ApiOperation({ summary: 'Active announcements/banners for me' })
  active(@CurrentUser() user: AuthUser) {
    return this.announcements.activeFor(user.id);
  }
}

@Global()
@Module({
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
