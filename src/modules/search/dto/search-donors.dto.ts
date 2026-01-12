import { IsString, IsEnum } from 'class-validator';

export enum SearchType {
  BLOOD = 'blood',
  ORGAN = 'organ',
}

export class SearchDonorsDto {
  @IsEnum(SearchType)
  searchType: SearchType;

  @IsString()
  filterType: string; // blood type (A+, O+, etc.) or organ type (kidney, liver, etc.)
}
