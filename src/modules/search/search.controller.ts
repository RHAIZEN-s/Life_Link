import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SearchService } from '../../services/search.service';
import { SearchDonorsDto } from './dto/search-donors.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Donor Search')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing, invalid or expired access token.',
})
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @ApiOperation({
    summary: 'Search available blood or organ donors (returns contact details)',
  })
  @ApiCreatedResponse({
    description: 'Matching donors (up to 100).',
    schema: { example: { results: [], total: 0 } },
  })
  @ApiBadRequestResponse({ description: 'Invalid search type or filter.' })
  @Post('donors')
  async searchDonors(@Body() dto: SearchDonorsDto) {
    return this.search.searchDonors(dto);
  }
}
