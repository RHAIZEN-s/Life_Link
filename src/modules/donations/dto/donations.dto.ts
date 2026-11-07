import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
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
import { BLOOD_GROUPS, DONATION_TYPES } from '../../../common/constants';
import { NormalizeEmail } from '../../../common/normalize-email';
import { Trim, TrimToNull } from '../../../common/validators';
import type { BloodGroup, DonationType } from '../../../types/database.types';

export class CreateDonationDto {
  @ApiProperty({ enum: DONATION_TYPES })
  @IsIn(DONATION_TYPES)
  donationType: DonationType;

  @ApiPropertyOptional({
    enum: BLOOD_GROUPS,
    description: 'Defaults to the profile blood group.',
  })
  @IsOptional()
  @IsIn(BLOOD_GROUPS)
  bloodGroup?: BloodGroup;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  units?: number;

  @ApiProperty({ example: '2025-08-08', format: 'date' })
  @IsDateString({ strict: true })
  donatedOn: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  hospitalId?: string;

  @ApiPropertyOptional({ example: 'City Hospital' })
  @ValidateIf((o: CreateDonationDto) => !o.hospitalId)
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  hospitalName?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  requestId?: string;

  @ApiPropertyOptional()
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

// Used by hospital admins to record a verified donation for a donor. The
// donation is always linked to the admin's own hospital.
export class RecordDonationDto extends OmitType(CreateDonationDto, [
  'hospitalId',
  'hospitalName',
] as const) {
  @ApiProperty({ example: 'donor@example.com' })
  @NormalizeEmail()
  @IsEmail()
  donorEmail: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Super admins only: the hospital the donation was made at.',
  })
  @IsOptional()
  @IsUUID()
  hospitalId?: string;
}
