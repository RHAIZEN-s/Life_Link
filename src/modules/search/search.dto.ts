import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, ValidateIf } from 'class-validator';
import { QueryBoolean } from '../requests/dto/requests.dto';
import { BLOOD_GROUPS, ORGAN_TYPES } from '../../common/constants';
import { GeoPaginationQueryDto } from '../../common/query.dto';
import type {
  BloodGroup,
  OrganType,
  RequestType,
} from '../../types/database.types';

export class SearchDonorsQueryDto extends GeoPaginationQueryDto {
  @ApiProperty({ enum: ['blood', 'organ'] })
  @IsIn(['blood', 'organ'])
  type: RequestType;

  @ApiPropertyOptional({
    enum: BLOOD_GROUPS,
    description: 'Required when type=blood.',
  })
  @ValidateIf((o: SearchDonorsQueryDto) => o.type === 'blood')
  @IsIn(BLOOD_GROUPS)
  bloodGroup?: BloodGroup;

  @ApiPropertyOptional({
    enum: ORGAN_TYPES,
    description: 'Required when type=organ.',
  })
  @ValidateIf((o: SearchDonorsQueryDto) => o.type === 'organ')
  @IsIn(ORGAN_TYPES)
  organType?: OrganType;

  @ApiPropertyOptional({
    default: true,
    description:
      'Blood: include every compatible group (e.g. O- donors for an A+ patient), exact match first.',
  })
  @QueryBoolean()
  @IsOptional()
  @IsBoolean()
  compatible?: boolean;
}
