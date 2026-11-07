import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';
import { DONATION_TYPES } from '../../common/constants';
import { PaginationQueryDto } from '../../common/query.dto';
import { TrimToNull } from '../../common/validators';
import type {
  AppointmentStatus,
  DonationType,
} from '../../types/database.types';

const STATUSES: AppointmentStatus[] = [
  'requested',
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
];

// A donor asks a hospital for a donation slot.
export class BookAppointmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  hospitalId: string;

  @ApiProperty({ example: '2026-11-05T10:00:00+05:30' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ enum: DONATION_TYPES, default: 'whole_blood' })
  @IsOptional()
  @IsIn(DONATION_TYPES)
  donationType?: DonationType;

  @ApiPropertyOptional({ example: 'Morning works best for me.' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

// Confirm / reschedule / add details.
export class UpdateAppointmentDto {
  @ApiPropertyOptional({ example: '2026-11-05T11:00:00+05:30' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ example: 'Blood bank, ground floor' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  locationText?: string;

  @ApiPropertyOptional({ example: 'Ask for Ravi at the counter.' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;
}

export class CancelAppointmentDto {
  @ApiPropertyOptional({ example: 'I have a fever today.' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CompleteAppointmentDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  units?: number;

  @ApiPropertyOptional()
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class AppointmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: [...STATUSES, 'upcoming'] })
  @IsOptional()
  @IsIn([...STATUSES, 'upcoming'])
  status?: AppointmentStatus | 'upcoming';
}
