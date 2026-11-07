import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { NormalizeEmail } from '../../../common/normalize-email';
import { PaginationQueryDto } from '../../../common/query.dto';
import {
  IsIndianPhone,
  OptionalLatitude,
  OptionalLongitude,
  Trim,
  TrimToNull,
} from '../../../common/validators';
import type {
  AccountStatus,
  RequestStatus,
  VerificationStatus,
} from '../../../types/database.types';
import {
  QueryBoolean,
  REQUEST_STATUSES,
} from '../../requests/dto/requests.dto';

export class UpdateHospitalDto {
  @ApiPropertyOptional({ example: 'Asha Hospital' })
  @Trim()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'Plot 21, Marine Lines' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((o: UpdateHospitalDto) => o.longitude !== undefined)
  @OptionalLatitude()
  latitude?: number | null;

  @ApiPropertyOptional()
  @ValidateIf((o: UpdateHospitalDto) => o.latitude !== undefined)
  @OptionalLongitude()
  longitude?: number | null;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsIndianPhone()
  phone?: string;

  @ApiPropertyOptional({ example: 'admin@ashahospital.com' })
  @NormalizeEmail()
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateHospitalDto extends UpdateHospitalDto {
  @ApiProperty({ example: 'Asha Hospital' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  declare name: string;

  @ApiPropertyOptional({ example: 'MH-HOSP-99821' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registrationNo?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

export class SuperAdminUpdateHospitalDto extends PartialType(
  CreateHospitalDto,
) {}

export class AddStaffDto {
  @ApiProperty({ example: 'Dr. Neeraj Deshmukh' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Dean' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title: string;
}

export class AssignAdminDto {
  @ApiProperty({ example: 'admin@ashahospital.com' })
  @NormalizeEmail()
  @IsEmail()
  email: string;
}

export class HospitalRequestsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: [...REQUEST_STATUSES, 'active'] })
  @IsOptional()
  @IsIn([...REQUEST_STATUSES, 'active'])
  status?: RequestStatus | 'active';

  @ApiPropertyOptional({ description: 'Only requests awaiting verification.' })
  @QueryBoolean()
  @IsOptional()
  @IsBoolean()
  unverified?: boolean;
}

export class UsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Name or email contains' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;

  @ApiPropertyOptional({
    enum: ['unverified', 'pending', 'verified', 'rejected'],
  })
  @IsOptional()
  @IsIn(['unverified', 'pending', 'verified', 'rejected'])
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional({ enum: ['active', 'suspended'] })
  @IsOptional()
  @IsIn(['active', 'suspended'])
  status?: AccountStatus;
}

export class VerifyUserDto {
  @ApiProperty({ enum: ['verified', 'rejected'] })
  @IsIn(['verified', 'rejected'])
  status: 'verified' | 'rejected';

  @ApiPropertyOptional({ example: 'ID photo is unreadable, please re-upload.' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ReasonDto {
  @ApiProperty({ example: 'Fake request reported by several donors' })
  @Trim()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ format: 'date', description: 'Default: 90 days ago' })
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({ format: 'date', description: 'Default: today' })
  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;

  @ApiPropertyOptional({ example: 'Pune' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}

export class SendAlertDto {
  @ApiProperty({
    format: 'uuid',
    description: 'One of your hospital’s open requests.',
  })
  @IsUUID()
  requestId: string;

  @ApiPropertyOptional({ example: 'Urgent: O- blood needed today' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({
    example: 'Please come to the blood bank, ground floor.',
  })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  radiusKm?: number;
}
