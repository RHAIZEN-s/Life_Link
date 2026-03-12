import { IsEmail, IsString, IsDateString, MinLength } from 'class-validator';

export class InitialProfileDto {
  @IsString()
  @MinLength(1)
  fullName: string;

  @IsDateString()
  dob: string;

  @IsString()
  @MinLength(1)
  gender: string;

  @IsString()
  @MinLength(1)
  bloodGroup: string;

  @IsString()
  @MinLength(1)
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  address: string;
}
