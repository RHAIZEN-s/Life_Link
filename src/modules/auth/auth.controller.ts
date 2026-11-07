import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser, Public } from './decorators';
import type { AuthUser } from './auth.types';
import {
  EmailDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';

const SESSION_EXAMPLE = {
  accessToken: 'eyJhbGciOiJIUzI1NiIs...',
  refreshToken: 'k3J9...',
  expiresIn: 900,
  user: {
    id: 'uuid',
    email: 'alice@example.com',
    name: 'Alice Example',
    role: 'user',
    hospitalId: null,
    profileCompleted: false,
  },
};

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Create an account and email a verification code' })
  @ApiConflictResponse({ description: 'Email already registered.' })
  @ApiTooManyRequestsResponse({ description: 'Code requested too recently.' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.name, dto.email, dto.password);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify the emailed code; returns a session' })
  @ApiOkResponse({ schema: { example: SESSION_EXAMPLE } })
  verifyEmail(@Body() dto: VerifyEmailDto, @Headers('user-agent') ua?: string) {
    return this.auth.verifyEmail(dto.email, dto.otp, ua);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(200)
  @ApiOperation({ summary: 'Email a new verification code' })
  resendVerification(@Body() dto: EmailDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiOkResponse({ schema: { example: SESSION_EXAMPLE } })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  login(@Body() dto: LoginDto, @Headers('user-agent') ua?: string) {
    return this.auth.login(dto.email, dto.password, ua);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Exchange a refresh token for a new session (rotates the token)',
  })
  @ApiOkResponse({ schema: { example: SESSION_EXAMPLE } })
  refresh(@Body() dto: RefreshTokenDto, @Headers('user-agent') ua?: string) {
    return this.auth.refresh(dto.refreshToken, ua);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Email a password reset code' })
  forgotPassword(@Body() dto: EmailDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Set a new password with the emailed code; signs out all devices',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.email, dto.otp, dto.newPassword);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current account' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
