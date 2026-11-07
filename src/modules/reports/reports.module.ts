import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Global,
  Injectable,
  Module,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestsService } from '../requests/requests.service';
import { TokenService } from '../auth/token.service';
import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { unwrap, unwrapOne } from '../../common/db';
import { PaginationQueryDto } from '../../common/query.dto';
import { TrimToNull } from '../../common/validators';
import type {
  ReportReason,
  ReportRow,
  ReportStatus,
} from '../../types/database.types';

const REASONS: ReportReason[] = [
  'fake_request',
  'spam',
  'abuse',
  'fraud',
  'no_show',
  'other',
];

export class CreateReportDto {
  @ApiProperty({ enum: ['user', 'request'] })
  @IsIn(['user', 'request'])
  targetType: 'user' | 'request';

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetId: string;

  @ApiProperty({ enum: REASONS })
  @IsIn(REASONS)
  reason: ReportReason;

  @ApiPropertyOptional({ example: 'The phone number is unreachable.' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

export class ReportsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['open', 'resolved', 'dismissed'],
    default: 'open',
  })
  @IsOptional()
  @IsIn(['open', 'resolved', 'dismissed'])
  status: ReportStatus = 'open';
}

export class ResolveReportDto {
  @ApiProperty({ enum: ['resolved', 'dismissed'] })
  @IsIn(['resolved', 'dismissed'])
  status: 'resolved' | 'dismissed';

  @ApiPropertyOptional({
    enum: ['none', 'suspend_user', 'remove_request'],
    default: 'none',
    description: 'Action taken together with resolving.',
  })
  @IsOptional()
  @IsIn(['none', 'suspend_user', 'remove_request'])
  action?: 'none' | 'suspend_user' | 'remove_request';

  @ApiPropertyOptional()
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly requests: RequestsService,
    private readonly tokens: TokenService,
  ) {}

  async create(reporter: AuthUser, dto: CreateReportDto) {
    if (dto.targetType === 'user') {
      if (dto.targetId === reporter.id) {
        throw new BadRequestException('You cannot report yourself');
      }
      unwrapOne(
        await this.supabase
          .from('users')
          .select('id')
          .eq('id', dto.targetId)
          .maybeSingle(),
        'reports.target.user',
        'User not found',
      );
    } else {
      await this.requests.getRow(dto.targetId);
    }
    const existing = unwrap(
      await this.supabase
        .from('reports')
        .select('id')
        .eq('reporter_id', reporter.id)
        .eq(
          dto.targetType === 'user' ? 'target_user_id' : 'target_request_id',
          dto.targetId,
        )
        .eq('status', 'open')
        .maybeSingle(),
      'reports.existing',
    );
    if (existing) {
      throw new ConflictException('You already reported this; we are on it');
    }
    unwrap(
      await this.supabase.from('reports').insert({
        reporter_id: reporter.id,
        target_type: dto.targetType,
        target_user_id: dto.targetType === 'user' ? dto.targetId : null,
        target_request_id: dto.targetType === 'request' ? dto.targetId : null,
        reason: dto.reason,
        details: dto.details ?? null,
      }),
      'reports.create',
    );
    return { ok: true };
  }

  async list(query: ReportsQueryDto) {
    const rows = unwrap(
      await this.supabase
        .from('reports')
        .select('*')
        .eq('status', query.status)
        .order('created_at', { ascending: query.status === 'open' })
        .range(query.offset, query.offset + query.limit - 1),
      'reports.list',
    );
    return this.enrich(rows);
  }

  async resolve(admin: AuthUser, id: string, dto: ResolveReportDto) {
    const report = unwrapOne(
      await this.supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .maybeSingle(),
      'reports.get',
      'Report not found',
    );
    if (report.status !== 'open') {
      throw new ConflictException(`Report is already ${report.status}`);
    }
    const action = dto.action ?? 'none';
    if (action === 'suspend_user') {
      const userId =
        report.target_user_id ??
        (await this.requests.getRow(report.target_request_id!)).requester_id;
      await this.suspendUser(admin, userId, dto.note ?? 'Reported by users');
    } else if (action === 'remove_request') {
      if (!report.target_request_id) {
        throw new BadRequestException('This report is not about a request');
      }
      await this.requests.flag(
        admin,
        report.target_request_id,
        dto.note ?? 'Removed by a moderator after a report',
      );
    }
    unwrap(
      await this.supabase
        .from('reports')
        .update({
          status: dto.status,
          resolution_note: dto.note ?? null,
          resolved_by: admin.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id),
      'reports.resolve',
    );
    await this.notifications.notify([
      {
        userId: report.reporter_id,
        type: 'moderation',
        title: 'Thanks for your report',
        body:
          dto.status === 'resolved'
            ? 'We reviewed it and took action.'
            : 'We reviewed it and found no violation.',
        data: { reportId: id },
      },
    ]);
    return { ok: true };
  }

  async suspendUser(admin: AuthUser, userId: string, reason: string) {
    const user = unwrapOne(
      await this.supabase
        .from('users')
        .select('id, role, status')
        .eq('id', userId)
        .maybeSingle(),
      'reports.suspend.user',
      'User not found',
    );
    if (user.role === 'super_admin' || user.id === admin.id) {
      throw new BadRequestException('This account cannot be suspended');
    }
    unwrap(
      await this.supabase
        .from('users')
        .update({
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          suspension_reason: reason,
        })
        .eq('id', userId),
      'reports.suspend',
    );
    // Ends their sessions; access tokens expire within minutes.
    await this.tokens.revokeAllForUser(userId);
    // Their open requests should not keep alerting donors.
    const open = unwrap(
      await this.supabase
        .from('donation_requests')
        .select('*')
        .eq('requester_id', userId)
        .in('status', ['pending', 'matched', 'in_progress']),
      'reports.suspend.requests',
    );
    for (const request of open) {
      await this.requests.close(
        request,
        'cancelled',
        admin.id,
        'Requester account suspended',
        true,
      );
    }
    return { ok: true };
  }

  async reinstateUser(userId: string) {
    unwrapOne(
      await this.supabase
        .from('users')
        .update({
          status: 'active',
          suspended_at: null,
          suspension_reason: null,
        })
        .eq('id', userId)
        .select('id')
        .maybeSingle(),
      'reports.reinstate',
      'User not found',
    );
    await this.notifications.notify([
      {
        userId,
        type: 'moderation',
        title: 'Your account is active again',
        body: 'Thank you for your patience.',
      },
    ]);
    return { ok: true };
  }

  private async enrich(rows: ReportRow[]) {
    if (!rows.length) return [];
    const userIds = [
      ...new Set(
        rows.flatMap((r) =>
          [r.reporter_id, r.target_user_id].filter((x): x is string => !!x),
        ),
      ),
    ];
    const requestIds = rows
      .map((r) => r.target_request_id)
      .filter((x): x is string => !!x);
    const [users, requests] = await Promise.all([
      this.supabase
        .from('users')
        .select('id, name, email, status')
        .in('id', userIds),
      this.supabase
        .from('donation_requests')
        .select('id, patient_name, hospital_name, status, requester_id')
        .in('id', requestIds),
    ]);
    const userById = new Map(
      unwrap(users, 'reports.users').map((u) => [u.id, u]),
    );
    const requestById = new Map(
      unwrap(requests, 'reports.requests').map((r) => [r.id, r]),
    );
    return rows.map((r) => ({
      id: r.id,
      targetType: r.target_type,
      reason: r.reason,
      details: r.details,
      status: r.status,
      resolutionNote: r.resolution_note,
      createdAt: r.created_at,
      reporter: userById.get(r.reporter_id) ?? null,
      targetUser: r.target_user_id
        ? (userById.get(r.target_user_id) ?? null)
        : null,
      targetRequest: r.target_request_id
        ? (requestById.get(r.target_request_id) ?? null)
        : null,
    }));
  }
}

@ApiTags('Moderation')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Report a suspicious request or user' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReportDto) {
    return this.reports.create(user, dto);
  }
}

@Global()
@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
