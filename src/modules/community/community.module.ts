import {
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SupabaseService } from '../supabase/supabase.service';
import {
  ProfileService,
  toBadges,
  toStatsDto,
} from '../profile/profile.service';
import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { unwrap } from '../../common/db';
import { TrimToNull } from '../../common/validators';

class LeaderboardQueryDto {
  @ApiPropertyOptional({ enum: ['all', 'year', 'month'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'year', 'month'])
  period: 'all' | 'year' | 'month' = 'all';

  @ApiPropertyOptional({ example: 'Pune' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}

@Injectable()
export class CommunityService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly profiles: ProfileService,
  ) {}

  async leaderboard(viewerId: string, query: LeaderboardQueryDto) {
    const since =
      query.period === 'all'
        ? null
        : new Date(Date.now() - (query.period === 'year' ? 365 : 30) * 86400e3)
            .toISOString()
            .slice(0, 10);
    const rows = unwrap(
      await this.supabase.client.rpc('leaderboard', {
        p_viewer: viewerId,
        p_city: query.city ?? null,
        p_since: since,
        p_limit: 20,
      }),
      'community.leaderboard',
    );
    const entries = rows.map((r) => ({
      rank: r.rank,
      // Don't leak ids of donors who opted out of the leaderboard.
      userId: r.display_name === 'Anonymous donor' ? null : r.user_id,
      displayName: r.display_name,
      city: r.city,
      bloodGroup: r.blood_group,
      verifiedDonations: r.verified_donations,
      points: r.points,
      isMe: r.is_me,
    }));
    return {
      period: query.period,
      city: query.city ?? null,
      entries: entries.filter((e) => e.rank <= 20),
      me: entries.find((e) => e.isMe) ?? null,
    };
  }

  // Public donor card: no contact details, no medical data.
  async donorProfile(donorId: string) {
    const user = unwrap(
      await this.supabase
        .from('users')
        .select('id, name, role, status, verification_status, created_at')
        .eq('id', donorId)
        .maybeSingle(),
      'community.donor',
    );
    if (!user || user.role !== 'user' || user.status !== 'active') {
      throw new NotFoundException('Donor not found');
    }
    const [profile, stats, rating, feedback] = await Promise.all([
      this.profiles.getProfileRow(donorId),
      this.profiles.getStats(donorId),
      this.profiles.getRating(donorId),
      this.supabase
        .from('ratings')
        .select('score, comment, created_at')
        .eq('donor_id', donorId)
        .not('comment', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    return {
      id: user.id,
      name: user.name,
      verified: user.verification_status === 'verified',
      memberSince: user.created_at,
      bloodGroup: profile?.blood_group ?? null,
      city: profile?.city ?? null,
      avatarUrl: await this.profiles.avatarUrl(profile?.avatar_path ?? null),
      availableToDonate: profile?.available_to_donate ?? false,
      stats: toStatsDto(stats),
      badges: toBadges(stats),
      rating,
      feedback: unwrap(feedback, 'community.feedback').map((f) => ({
        score: f.score,
        comment: f.comment,
        createdAt: f.created_at,
      })),
    };
  }
}

@ApiTags('Community')
@ApiBearerAuth()
@Controller()
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('leaderboard')
  @ApiOperation({
    summary: 'Top donors by points (first name + initial only), plus my rank',
  })
  leaderboard(
    @CurrentUser() user: AuthUser,
    @Query() query: LeaderboardQueryDto,
  ) {
    return this.community.leaderboard(user.id, query);
  }

  @Get('donors/:id')
  @ApiOperation({
    summary: 'Public donor profile: badges, donations, rating, feedback',
  })
  donor(@Param('id', ParseUUIDPipe) id: string) {
    return this.community.donorProfile(id);
  }
}

@Module({
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
