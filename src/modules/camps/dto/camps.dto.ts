import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  OptionalLatitude,
  OptionalLongitude,
  Trim,
  TrimToNull,
} from '../../../common/validators';
import type { CampStatus } from '../../../types/database.types';

export class CreateCampDto {
  @ApiProperty({ example: 'Community Blood Drive' })
  @Trim()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional()
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'Community Health Center, Shivajinagar' })
  @Trim()
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  address: string;

  @ApiPropertyOptional({ example: 'Pune' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: CreateCampDto) => o.longitude !== undefined)
  @OptionalLatitude()
  latitude?: number;

  @ApiPropertyOptional()
  @ValidateIf((o: CreateCampDto) => o.latitude !== undefined)
  @OptionalLongitude()
  longitude?: number;

  @ApiProperty({ example: '2026-11-15T09:00:00+05:30' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-11-15T17:00:00+05:30' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  capacity?: number;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Super admins only: the organising hospital.',
  })
  @IsOptional()
  @IsUUID()
  hospitalId?: string;
}

export class UpdateCampDto extends PartialType(CreateCampDto) {
  @ApiPropertyOptional({ enum: ['scheduled', 'cancelled', 'completed'] })
  @IsOptional()
  @IsIn(['scheduled', 'cancelled', 'completed'])
  status?: CampStatus;
}
