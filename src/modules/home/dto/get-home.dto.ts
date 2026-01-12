import { IsEmail, IsOptional, IsNumber } from 'class-validator';

export class GetHomeDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  radiusKm?: number;
}
