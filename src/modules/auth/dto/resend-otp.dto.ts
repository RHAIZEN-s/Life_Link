import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NormalizeEmail } from '../../../common/normalize-email';

export class ResendOtpDto {
  @ApiProperty({ example: 'alice@example.com' })
  @NormalizeEmail()
  @IsEmail()
  email: string;
}
