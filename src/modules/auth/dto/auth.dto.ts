import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NormalizeEmail } from '../../../common/normalize-email';
import { Trim } from '../../../common/validators';
import { IsStrongPassword } from './password';

export class EmailDto {
  @ApiProperty({ example: 'alice@example.com' })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class RegisterDto extends EmailDto {
  @ApiProperty({ example: 'Alice Example' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsStrongPassword()
  password: string;
}

export class LoginDto extends EmailDto {
  @ApiProperty({ example: 'Password123' })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}

export class VerifyEmailDto extends EmailDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'otp must be 6 digits' })
  otp: string;
}

export class ResetPasswordDto extends VerifyEmailDto {
  @IsStrongPassword()
  newPassword: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  refreshToken: string;
}
