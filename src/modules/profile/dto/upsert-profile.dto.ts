import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  BLOOD_GROUPS,
  GENDERS,
  GENETIC_DISORDERS,
  ORGAN_TYPES,
} from '../../../common/constants';
import {
  IsIndianPhone,
  OptionalLatitude,
  OptionalLongitude,
  Trim,
  TrimToNull,
} from '../../../common/validators';
import type {
  BloodGroup,
  Gender,
  GeneticDisorder,
  OrganType,
  ThemePreference,
} from '../../../types/database.types';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

// Core fields are required (they make a profile "complete"). Optional fields
// follow PATCH semantics: omitted = unchanged, null = cleared.
export class UpsertProfileDto {
  @ApiProperty({ example: 'Alice Example' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '1999-01-01', format: 'date' })
  @IsDateString({ strict: true })
  dob: string;

  @ApiProperty({ enum: GENDERS })
  @IsIn(GENDERS)
  gender: Gender;

  @ApiPropertyOptional({
    enum: BLOOD_GROUPS,
    nullable: true,
    description: 'Required for donors; optional for recipients.',
  })
  @IsOptional()
  @IsIn(BLOOD_GROUPS)
  bloodGroup?: BloodGroup | null;

  @ApiProperty({ example: '+919876543210' })
  @IsIndianPhone()
  phone: string;

  @ApiProperty({ example: 'FC Road, Shivajinagar, Pune' })
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
  city?: string | null;

  @ApiPropertyOptional({ example: 18.5308 })
  @ValidateIf((o: UpsertProfileDto) => o.longitude !== undefined)
  @OptionalLatitude()
  latitude?: number | null;

  @ApiPropertyOptional({ example: 73.8475 })
  @ValidateIf((o: UpsertProfileDto) => o.latitude !== undefined)
  @OptionalLongitude()
  longitude?: number | null;

  @ApiPropertyOptional({ enum: ['donor', 'recipient'] })
  @IsOptional()
  @IsIn(['donor', 'recipient'])
  registeredAs?: 'donor' | 'recipient';

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  associatedHospitalId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  availableToDonate?: boolean;

  @ApiPropertyOptional({
    description: 'Show my phone number to people searching for donors.',
  })
  @IsOptional()
  @IsBoolean()
  shareContact?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  receiveNotifications?: boolean;

  @ApiPropertyOptional({ example: 'None' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  existingDiseases?: string | null;

  @ApiPropertyOptional({ enum: GENETIC_DISORDERS, nullable: true })
  @IsOptional()
  @IsIn(GENETIC_DISORDERS)
  geneticDisorder?: GeneticDisorder | null;

  @ApiPropertyOptional()
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  geneticDisorderOther?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsBoolean()
  hadSurgeryLast5Years?: boolean | null;

  @ApiPropertyOptional()
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  allergies?: string | null;

  @ApiPropertyOptional()
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  medications?: string | null;

  @ApiPropertyOptional({ enum: ORGAN_TYPES, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(ORGAN_TYPES, { each: true })
  organPledges?: OrganType[];

  @ApiPropertyOptional({ description: 'Appear on the public leaderboard.' })
  @IsOptional()
  @IsBoolean()
  showOnLeaderboard?: boolean;

  @ApiPropertyOptional({ enum: THEMES })
  @IsOptional()
  @IsIn(THEMES)
  themePreference?: ThemePreference;
}

// Quick toggles that don't require the full profile form.
export class UpdatePreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  availableToDonate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shareContact?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  receiveNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showOnLeaderboard?: boolean;

  @ApiPropertyOptional({ enum: THEMES })
  @IsOptional()
  @IsIn(THEMES)
  themePreference?: ThemePreference;

  @ApiPropertyOptional({ example: 18.5308, nullable: true })
  @ValidateIf((o: UpdatePreferencesDto) => o.longitude !== undefined)
  @OptionalLatitude()
  latitude?: number | null;

  @ApiPropertyOptional({ example: 73.8475, nullable: true })
  @ValidateIf((o: UpdatePreferencesDto) => o.latitude !== undefined)
  @OptionalLongitude()
  longitude?: number | null;

  @ApiPropertyOptional({ example: 'Pune', nullable: true })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string | null;
}

export class DeleteAccountDto {
  @ApiProperty({ description: 'Current password, to confirm.' })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}
