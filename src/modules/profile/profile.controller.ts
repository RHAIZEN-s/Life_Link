import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ProfileService } from '../../services/profile.service';
import { InitialProfileDto } from './dto/initial-profile.dto';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt-auth.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Profile')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing, invalid or expired access token.',
})
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @ApiOperation({
    summary: 'Create or update the logged-in user initial profile',
  })
  @ApiCreatedResponse({
    description: 'Profile saved.',
    schema: {
      example: {
        ok: true,
        profile: { user_id: 'uuid', full_name: 'Alice Example' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid profile data.' })
  @Post('initial')
  async upsertInitial(
    @CurrentUser() user: AuthUser,
    @Body() dto: InitialProfileDto,
  ) {
    return this.profile.upsertInitialProfile(user, dto);
  }

  @ApiOperation({ summary: 'Get the logged-in user initial profile' })
  @ApiOkResponse({
    description: 'Profile found.',
    schema: {
      example: {
        ok: true,
        profile: { user_id: 'uuid', full_name: 'Alice Example' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Profile not found.' })
  @Get('initial')
  async getInitial(@CurrentUser() user: AuthUser) {
    return this.profile.getInitialProfile(user.id);
  }
}
