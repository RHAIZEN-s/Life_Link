import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { GeoPaginationQueryDto } from '../../common/query.dto';
import { HomeService } from './home.service';

@ApiTags('Home')
@ApiBearerAuth()
@Controller('home')
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Get()
  @ApiOperation({
    summary:
      'Dashboard: my stats, nearby open requests, upcoming camps, unread count',
    description:
      'Uses lat/lng when given, otherwise the location saved on my profile.',
  })
  get(@CurrentUser() user: AuthUser, @Query() query: GeoPaginationQueryDto) {
    return this.home.getHome(user, query);
  }
}
