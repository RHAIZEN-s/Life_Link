import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ProfileService } from '../../services/profile.service';
import { InitialProfileDto } from './dto/initial-profile.dto';
import { GetProfileDto } from './dto/get-profile.dto';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Post('initial')
  async upsertInitial(@Body() dto: InitialProfileDto) {
    return this.profile.upsertInitialProfile(dto);
  }

  @Get('initial')
  async getInitial(@Query() dto: GetProfileDto) {
    return this.profile.getInitialProfile(dto.email);
  }
}
