import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset: number = 0;
}

// Optional "near me" filter shared by list endpoints.
export class GeoPaginationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 18.5204 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ example: 73.8567 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({
    example: 25,
    description: 'Only used together with lat/lng.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  radiusKm?: number;
}

export function geoArgs(query: GeoPaginationQueryDto) {
  const hasOrigin = query.lat !== undefined && query.lng !== undefined;
  return {
    p_lat: hasOrigin ? query.lat : null,
    p_lng: hasOrigin ? query.lng : null,
    p_radius_km: hasOrigin ? (query.radiusKm ?? null) : null,
    p_limit: query.limit,
    p_offset: query.offset,
  };
}

export function roundKm(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}
