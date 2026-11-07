import {
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import type { UserRole } from '../../types/database.types';
import type { AuthUser } from './auth.types';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

// Opts a route out of the global JWT guard.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Restricts a route to the given roles (checked by RolesGuard).
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export type AuthenticatedRequest = Request & { user?: AuthUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) throw new UnauthorizedException();
    return request.user;
  },
);
