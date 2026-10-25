import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from '../../services/auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyDto } from './dto/verify.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiTags,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @ApiOperation({
    summary: 'Register a user and send an email verification code',
  })
  @ApiCreatedResponse({
    description: 'User registered.',
    schema: { example: { ok: true } },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or email already registered.',
  })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.name, dto.email, dto.password);
  }

  // API-only OTP verification (no server-rendered page)
  @ApiOperation({ summary: 'Verify a user account with the emailed OTP' })
  @ApiCreatedResponse({
    description: 'Email verified.',
    schema: { example: { ok: true } },
  })
  @ApiBadRequestResponse({
    description: 'Invalid email or OTP, or the OTP has expired.',
  })
  @Post('verify')
  async verify(@Body() dto: VerifyDto) {
    return this.auth.verify(dto.email, dto.otp);
  }

  @ApiOperation({
    summary: 'Send a new verification code to an unverified account',
  })
  @ApiCreatedResponse({
    description: 'Code sent if the account exists and is unverified.',
    schema: { example: { ok: true } },
  })
  @Post('resend-otp')
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.auth.resendOtp(dto.email);
  }

  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiCreatedResponse({
    description: 'Login successful.',
    schema: {
      example: { access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or email not verified.',
  })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}
