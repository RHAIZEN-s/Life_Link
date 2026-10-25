import { IsString, IsEnum, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SearchType {
  BLOOD = 'blood',
  ORGAN = 'organ',
}

export class SearchDonorsDto {
  @ApiProperty({ enum: SearchType, example: SearchType.BLOOD })
  @IsEnum(SearchType)
  searchType: SearchType;

  @ApiProperty({
    example: 'A+',
    description: 'Blood type or organ type, depending on searchType.',
  })
  @IsString()
  @MinLength(1)
  filterType: string; // blood type (A+, O+, etc.) or organ type (kidney, liver, etc.)
}
