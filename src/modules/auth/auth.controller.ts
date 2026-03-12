import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from '../../services/auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyDto } from './dto/verify.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.name, dto.email, dto.password);
  }

  // API-only OTP verification (no server-rendered page)
  @Post('verify')
  async verify(@Body() dto: VerifyDto) {
    return this.auth.verify(dto.email, dto.otp);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}