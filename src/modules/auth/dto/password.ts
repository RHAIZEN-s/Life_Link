import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

// bcrypt only uses the first 72 bytes, so longer passwords are rejected.
export const IsStrongPassword = () =>
  applyDecorators(
    ApiProperty({
      example: 'Password123',
      minLength: 8,
      maxLength: 72,
      description: 'At least 8 characters with a letter and a number.',
    }),
    IsString(),
    MinLength(8),
    MaxLength(72),
    Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
      message: 'password must contain at least one letter and one number',
    }),
  );
