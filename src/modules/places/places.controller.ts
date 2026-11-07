import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Trim } from '../../common/validators';
import { PlacesService } from './places.service';

class PlaceSearchQueryDto {
  @ApiProperty({ example: 'Apollo Hospital Pune' })
  @Trim()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  query: string;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  limit: number = 5;
}

class ReverseQueryDto {
  @ApiProperty({ example: 18.5204 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: 73.8567 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

@ApiTags('Places')
@ApiBearerAuth()
@Controller('places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search places/addresses (returns coordinates)' })
  search(@Query() q: PlaceSearchQueryDto) {
    return this.places.search(q.query, q.limit);
  }

  @Get('reverse')
  @ApiOperation({ summary: 'Address for coordinates (current location)' })
  reverse(@Query() q: ReverseQueryDto) {
    return this.places.reverse(q.lat, q.lng);
  }
}
