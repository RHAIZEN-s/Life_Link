import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetHomeDto {
  @ApiPropertyOptional({
    example: 19.076,
    description: 'Latitude used for nearby request distances.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    example: 72.8777,
    description: 'Longitude used for nearby request distances.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    example: 5,
    default: 5,
    description: 'Search radius in kilometers.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  radiusKm?: number;
}
