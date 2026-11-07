import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import type { UserRole } from '../../../types/database.types';

function context(role: UserRole | undefined): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({
        user: role
          ? { id: 'u', email: 'e', role, hospitalId: null }
          : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

function guardRequiring(roles: UserRole[] | undefined) {
  const reflector = { getAllAndOverride: () => roles } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('allows any authenticated user when no roles are required', () => {
    expect(guardRequiring(undefined).canActivate(context('user'))).toBe(true);
  });

  it('allows a matching role', () => {
    expect(
      guardRequiring(['hospital_admin', 'super_admin']).canActivate(
        context('hospital_admin'),
      ),
    ).toBe(true);
  });

  it('blocks a regular user from admin routes', () => {
    expect(() =>
      guardRequiring(['hospital_admin', 'super_admin']).canActivate(
        context('user'),
      ),
    ).toThrow(ForbiddenException);
  });

  it('blocks a hospital admin from super-admin routes', () => {
    expect(() =>
      guardRequiring(['super_admin']).canActivate(context('hospital_admin')),
    ).toThrow(ForbiddenException);
  });

  it('blocks requests without a user', () => {
    expect(() =>
      guardRequiring(['user']).canActivate(context(undefined)),
    ).toThrow(ForbiddenException);
  });
});
