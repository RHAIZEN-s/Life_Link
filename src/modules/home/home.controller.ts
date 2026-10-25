import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { HomeService } from '../../services/home.service';
import { GetHomeDto } from './dto/get-home.dto';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt-auth.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Home')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing, invalid or expired access token.',
})
@UseGuards(JwtAuthGuard)
@Controller('home')
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @ApiOperation({
    summary: 'Get dashboard statistics, nearby requests, and upcoming camps',
  })
  @ApiOkResponse({
    description: 'Dashboard data.',
    schema: {
      example: {
        userStats: {
          userName: 'Alice Example',
          bloodType: 'A+',
          donations: 2,
          points: 100,
        },
        nearbyRequests: [],
        upcomingCamps: [],
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid query or user not found.' })
  @Get()
  async getHomeData(@CurrentUser() user: AuthUser, @Query() dto: GetHomeDto) {
    return this.home.getHomeData(
      user.id,
      dto.latitude,
      dto.longitude,
      dto.radiusKm,
    );
  }
}
