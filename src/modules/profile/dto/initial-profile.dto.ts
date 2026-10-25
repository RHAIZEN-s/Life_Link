import { IsString, IsDateString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// The profile email is taken from the logged-in user's token, not the body.
export class InitialProfileDto {
  @ApiProperty({ example: 'Alice Example' })
  @IsString()
  @MinLength(1)
  fullName: string;

  @ApiProperty({ example: '1999-01-01', format: 'date' })
  @IsDateString()
  dob: string;

  @ApiProperty({ example: 'Female' })
  @IsString()
  @MinLength(1)
  gender: string;

  @ApiProperty({ example: 'A+' })
  @IsString()
  @MinLength(1)
  bloodGroup: string;

  @ApiProperty({ example: '+1 555 123 4567' })
  @IsString()
  @MinLength(1)
  phone: string;

  @ApiProperty({ example: '123 Main Street, Springfield' })
  @IsString()
  @MinLength(1)
  address: string;
}
