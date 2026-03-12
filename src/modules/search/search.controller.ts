import { Controller, Post, Body } from '@nestjs/common';
import { SearchService } from '../../services/search.service';
import { SearchDonorsDto } from './dto/search-donors.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Post('donors')
  async searchDonors(@Body() dto: SearchDonorsDto) {
    return this.search.searchDonors(dto);
  }
}
