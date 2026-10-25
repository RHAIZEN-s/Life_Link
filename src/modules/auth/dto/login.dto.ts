import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NormalizeEmail } from '../../../common/normalize-email';

export class LoginDto {
  @ApiProperty({ example: 'alice@example.com' })
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  password: string;
}
