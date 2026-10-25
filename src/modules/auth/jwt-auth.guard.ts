import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
}

type AuthenticatedRequest = Request & { user?: AuthUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: string | jwt.JwtPayload;
    try {
      payload = jwt.verify(
        token,
        this.config.getOrThrow<string>('JWT_SECRET'),
        { algorithms: ['HS256'] },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string'
    ) {
      throw new UnauthorizedException('Invalid token payload');
    }

    request.user = { id: payload.sub, email: payload.email };
    return true;
  }
}

// Injects the user resolved by JwtAuthGuard.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException();
    }
    return request.user;
  },
);
