import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
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
  BLOOD_GROUPS,
  DONATION_TYPES,
  GENDERS,
  ORGAN_TYPES,
  REQUEST_PRIORITIES,
} from '../../../common/constants';
import {
  GeoPaginationQueryDto,
  PaginationQueryDto,
} from '../../../common/query.dto';
import {
  IsIndianPhone,
  OptionalLatitude,
  OptionalLongitude,
  Trim,
  TrimToNull,
} from '../../../common/validators';
import type {
  BloodGroup,
  DonationType,
  Gender,
  OrganType,
  RequestPriority,
  RequestStatus,
  RequestType,
  ResponseStatus,
} from '../../../types/database.types';

export const REQUEST_STATUSES: RequestStatus[] = [
  'pending',
  'matched',
  'in_progress',
  'completed',
  'cancelled',
];

// "true"/"false" query strings → booleans.
export const QueryBoolean = () =>
  Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  );

export class CreateRequestDto {
  @ApiProperty({ enum: ['blood', 'organ'] })
  @IsIn(['blood', 'organ'])
  requestType: RequestType;

  @ApiPropertyOptional({
    enum: BLOOD_GROUPS,
    description: 'Required for blood requests; recommended for organs.',
  })
  @ValidateIf(
    (o: CreateRequestDto) =>
      o.requestType === 'blood' || o.bloodGroup !== undefined,
  )
  @IsIn(BLOOD_GROUPS)
  bloodGroup?: BloodGroup;

  @ApiPropertyOptional({
    enum: ORGAN_TYPES,
    description: 'Required for organ requests.',
  })
  @ValidateIf((o: CreateRequestDto) => o.requestType === 'organ')
  @IsIn(ORGAN_TYPES)
  organType?: OrganType;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 50,
    description: 'Required for blood requests.',
  })
  @ValidateIf((o: CreateRequestDto) => o.requestType === 'blood')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  unitsRequired?: number;

  @ApiProperty({ example: 'Rahul Kumar' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  patientName: string;

  @ApiPropertyOptional({ example: 32 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(130)
  patientAge?: number;

  @ApiPropertyOptional({ enum: GENDERS })
  @IsOptional()
  @IsIn(GENDERS)
  patientGender?: Gender;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Registered hospital (preferred).',
  })
  @IsOptional()
  @IsUUID()
  hospitalId?: string;

  @ApiPropertyOptional({
    example: 'Apollo Hospital',
    description: 'Used when hospitalId is not set.',
  })
  @ValidateIf((o: CreateRequestDto) => !o.hospitalId)
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  hospitalName?: string;

  @ApiProperty({ example: '+919876543210' })
  @IsIndianPhone()
  contactPhone: string;

  @ApiProperty({ example: 'Shivajinagar, Pune' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  locationText: string;

  @ApiPropertyOptional({ example: 'Pune' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 18.5308 })
  @ValidateIf((o: CreateRequestDto) => o.longitude !== undefined)
  @OptionalLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 73.8475 })
  @ValidateIf((o: CreateRequestDto) => o.latitude !== undefined)
  @OptionalLongitude()
  longitude?: number;

  @ApiPropertyOptional({ enum: REQUEST_PRIORITIES, default: 'medium' })
  @IsOptional()
  @IsIn(REQUEST_PRIORITIES)
  priority?: RequestPriority;

  @ApiPropertyOptional({
    format: 'date',
    description: 'For scheduled (non-emergency) requests.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  neededBy?: string;

  @ApiPropertyOptional()
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'One of my uploaded documents (e.g. a medical report) proving the need.',
  })
  @IsOptional()
  @IsUUID()
  documentId?: string;
}

export class ListRequestsQueryDto extends GeoPaginationQueryDto {
  @ApiPropertyOptional({ enum: ['blood', 'organ'] })
  @IsOptional()
  @IsIn(['blood', 'organ'])
  type?: RequestType;

  @ApiPropertyOptional({ enum: BLOOD_GROUPS })
  @IsOptional()
  @IsIn(BLOOD_GROUPS)
  bloodGroup?: BloodGroup;

  @ApiPropertyOptional({ enum: ORGAN_TYPES })
  @IsOptional()
  @IsIn(ORGAN_TYPES)
  organType?: OrganType;

  @ApiPropertyOptional({
    default: false,
    description: 'Only requests my blood group / organ pledges can help.',
  })
  @QueryBoolean()
  @IsOptional()
  @IsBoolean()
  compatibleOnly?: boolean;
}

export class MyRequestsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: [...REQUEST_STATUSES, 'active'] })
  @IsOptional()
  @IsIn([...REQUEST_STATUSES, 'active'])
  status?: RequestStatus | 'active';
}

export class UpdateRequestStatusDto {
  @ApiProperty({ enum: ['completed', 'cancelled'] })
  @IsIn(['completed', 'cancelled'])
  status: 'completed' | 'cancelled';

  @ApiPropertyOptional({ example: 'Arranged through the blood bank.' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RespondDto {
  @ApiProperty({ enum: ['accepted', 'declined'] })
  @IsIn(['accepted', 'declined'])
  status: ResponseStatus;

  @ApiPropertyOptional({ example: 'I can reach in 30 minutes.' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class MyResponsesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['accepted', 'declined'] })
  @IsOptional()
  @IsIn(['accepted', 'declined'])
  status?: ResponseStatus;
}

export class DonorRefDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  donorId: string;
}

export class ScheduleAppointmentDto extends DonorRefDto {
  @ApiProperty({ example: '2026-11-02T10:30:00+05:30' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ example: 'Blood bank, ground floor, Gate 2' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  locationText?: string;

  @ApiPropertyOptional({
    example: 'Ask for Ravi at the counter. Bring a photo ID.',
    description: 'Only visible to the donor and coordinators.',
  })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;

  @ApiPropertyOptional({ enum: DONATION_TYPES })
  @IsOptional()
  @IsIn(DONATION_TYPES)
  donationType?: DonationType;
}

export class RateDto {
  @ApiProperty({ enum: ['donor', 'hospital'] })
  @IsIn(['donor', 'hospital'])
  target: 'donor' | 'hospital';

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required when target=donor.',
  })
  @ValidateIf((o: RateDto) => o.target === 'donor')
  @IsUUID()
  donorId?: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @ApiPropertyOptional({ example: 'Arrived on time, very kind.' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
