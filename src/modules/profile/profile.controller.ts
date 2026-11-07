import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Patch,
  Get,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { AVATAR_MAX_BYTES } from '../../common/constants';
import { ProfileService } from './profile.service';
import {
  DeleteAccountDto,
  UpdatePreferencesDto,
  UpsertProfileDto,
} from './dto/upsert-profile.dto';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'My profile, medical details, stats and badges' })
  get(@CurrentUser() user: AuthUser) {
    return this.profile.getProfile(user.id);
  }

  @Put()
  @ApiOperation({
    summary: 'Create or update my profile',
    description:
      'Core fields are required. Optional fields: omitted = unchanged, null = cleared.',
  })
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertProfileDto) {
    return this.profile.upsertProfile(user.id, dto);
  }

  @Post('avatar')
  @ApiOperation({
    summary: 'Upload my profile photo (JPEG/PNG/WebP, max 5 MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
    }),
  )
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.profile.setAvatar(user.id, file);
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Remove my profile photo' })
  removeAvatar(@CurrentUser() user: AuthUser) {
    return this.profile.removeAvatar(user.id);
  }

  @Patch('preferences')
  @ApiOperation({
    summary:
      'Quick settings: availability, privacy, notifications, theme, location',
  })
  preferences(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.profile.updatePreferences(user.id, dto);
  }

  @Get('feedback')
  @ApiOperation({ summary: 'Ratings and comments recipients left for me' })
  feedback(@CurrentUser() user: AuthUser) {
    return this.profile.feedback(user.id);
  }

  @Get('export')
  @ApiOperation({ summary: 'Download all data stored about me (JSON)' })
  export(@CurrentUser() user: AuthUser) {
    return this.profile.exportData(user.id);
  }

  @Post('delete')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Permanently delete my account and data (password required)',
  })
  deleteAccount(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto) {
    return this.profile.deleteAccount(user.id, dto.password);
  }
}
