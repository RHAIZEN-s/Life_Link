import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NormalizeEmail } from '../../../common/normalize-email';

export class VerifyDto {
  @ApiProperty({ example: 'alice@example.com' })
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  otp: string;
}
