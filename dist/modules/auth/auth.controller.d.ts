import { AuthService } from '../../services/auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyDto } from './dto/verify.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    register(dto: RegisterDto): Promise<{
        ok: boolean;
    }>;
    verify(dto: VerifyDto): Promise<{
        ok: boolean;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: any;
    }>;
}
