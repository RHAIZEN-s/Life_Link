"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../modules/supabase/supabase.service");
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const config_1 = require("@nestjs/config");
const nodemailer_1 = __importDefault(require("nodemailer"));
let AuthService = class AuthService {
    supabase;
    config;
    transporter;
    jwtSecret;
    constructor(supabase, config) {
        this.supabase = supabase;
        this.config = config;
        const host = this.config.get('SMTP_HOST');
        const port = this.config.get('SMTP_PORT');
        const user = this.config.get('SMTP_USER');
        const pass = this.config.get('SMTP_PASS');
        this.jwtSecret = this.config.get('JWT_SECRET') || 'change-me';
        if (host && port && user && pass) {
            this.transporter = nodemailer_1.default.createTransport({ host, port, auth: { user, pass }, secure: port === 465 });
        }
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async register(name, email, password) {
        const { data: existing } = await this.supabase.supabase.from('users').select('*').eq('email', email).limit(1);
        if (existing && existing.length) {
            throw new common_1.BadRequestException('Email already registered');
        }
        const hashed = await bcrypt.hash(password, 10);
        const otp = this.generateOtp();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const expires_at = new Date(Date.now() + 1000 * 60 * 15);
        const { data, error } = await this.supabase.supabase
            .from('users')
            .insert({ name, email, password_hash: hashed, is_verified: false, verification_otp_hash: hashedOtp, verification_expires_at: expires_at })
            .select()
            .single();
        if (error)
            throw new common_1.BadRequestException(error.message);
        if (this.transporter) {
            const backend = this.config.get('BACKEND_URL') || `http://localhost:${this.config.get('PORT') || 3000}`;
            await this.transporter.sendMail({
                from: this.config.get('SMTP_FROM') || this.config.get('SMTP_USER'),
                to: email,
                subject: 'Your verification code',
                text: `Hello ${name},\nYour verification code is: ${otp}\nIt expires in 15 minutes. Use this code with POST ${backend}/auth/verify`,
                html: `
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>Email OTP</title>
            </head>
            <body style="margin:0;background:#f3f6fb;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial;">
              <table role="presentation" width="100%" style="height:100%;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table role="presentation" style="background:#fff;max-width:520px;width:92%;border-radius:10px;padding:28px;box-shadow:0 10px 30px rgba(20,30,40,0.06);">
                      <tr>
                        <td style="text-align:center;padding-bottom:8px;">
                          <h1 style="margin:0;font-size:22px;color:#2563eb;">Email OTP</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #e9eef6;margin-top:12px;padding-top:18px;">
                          <p style="margin:0 0 12px;color:#333;font-size:14px;">Dear ${name},</p>
                          <p style="margin:0 0 18px;color:#555;font-size:14px;">Your One-Time Password (OTP) is:</p>
                          <div style="text-align:center;margin-bottom:18px;">
                            <span style="display:inline-block;background:#e9f8ec;color:#16a34a;padding:14px 22px;border-radius:8px;font-size:28px;font-weight:600;letter-spacing:4px;">${otp}</span>
                          </div>
                          <p style="margin:0 0 10px;color:#666;font-size:13px;">Please use this OTP to complete your login process. Do not share this code with anyone.</p>
                          <p style="margin:12px 0 0;color:#999;font-size:12px;">This code expires in 15 minutes.</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:18px;text-align:center;color:#999;font-size:12px;">
                          <p style="margin:0;">Thank you for using Email OTP!</p>
                          <p style="margin:6px 0 0;"><a href="#" style="color:#888;text-decoration:none;">© Your Company</a></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
            });
        }
        return { ok: true };
    }
    async verify(email, otp) {
        const { data } = await this.supabase.supabase.from('users').select('*').eq('email', email).limit(1).single();
        if (!data)
            throw new common_1.BadRequestException('Invalid email or OTP');
        if (!data.verification_otp_hash)
            throw new common_1.BadRequestException('No OTP set for this account');
        if (new Date(data.verification_expires_at) < new Date())
            throw new common_1.BadRequestException('OTP expired');
        const match = await bcrypt.compare(otp, data.verification_otp_hash);
        if (!match)
            throw new common_1.BadRequestException('Invalid OTP');
        const { error } = await this.supabase.supabase
            .from('users')
            .update({ is_verified: true, verification_otp_hash: null, verification_expires_at: null })
            .eq('id', data.id);
        if (error)
            throw new common_1.BadRequestException(error.message);
        return { ok: true };
    }
    async login(email, password) {
        const { data } = await this.supabase.supabase.from('users').select('*').eq('email', email).limit(1).single();
        if (!data)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const match = await bcrypt.compare(password, data.password_hash);
        if (!match)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (!data.is_verified)
            throw new common_1.UnauthorizedException('Email not verified');
        const payload = { sub: data.id, email: data.email };
        const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '1h' });
        return { access_token: token };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService, config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map