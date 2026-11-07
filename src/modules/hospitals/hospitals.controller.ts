import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/query.dto';
import { Trim } from '../../common/validators';
import { HospitalsService } from './hospitals.service';

class HospitalSearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'Apollo' })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;
}

@ApiTags('Hospitals')
@ApiBearerAuth()
@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitals: HospitalsService) {}

  @Get()
  @ApiOperation({ summary: 'Search hospitals by name or city' })
  search(@Query() q: HospitalSearchQueryDto) {
    return this.hospitals.search(q.query, q.limit, q.offset);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Hospital details with key staff' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.hospitals.get(id);
  }
}
