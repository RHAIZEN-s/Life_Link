import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { SearchService } from './search.service';
import { SearchDonorsQueryDto } from './search.dto';

@ApiTags('Donor Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get('donors')
  @ApiOperation({
    summary: 'Find available blood donors or organ pledgers',
    description:
      'Eligible donors first, then by distance. Phone numbers are only returned for donors who opted in.',
  })
  donors(@CurrentUser() user: AuthUser, @Query() query: SearchDonorsQueryDto) {
    return this.search.searchDonors(user.id, query);
  }
}
