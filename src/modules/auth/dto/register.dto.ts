import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NormalizeEmail } from '../../../common/normalize-email';

export class RegisterDto {
  @ApiProperty({ example: 'Alice Example', minLength: 1 })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'alice@example.com' })
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
