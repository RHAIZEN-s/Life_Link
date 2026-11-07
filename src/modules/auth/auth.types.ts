import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { UserRole } from '../../types/database.types';

// Identity resolved from a verified access token.
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  hospitalId: string | null;
}

// Hospital admins act for their own hospital; super admins must name one.
export function scopedHospitalFor(
  user: AuthUser,
  requested: string | null | undefined,
): string {
  if (user.role === 'super_admin') {
    if (!requested) throw new BadRequestException('hospitalId is required');
    return requested;
  }
  return requireHospital(user);
}

// Hospital filter for list endpoints: null means "all hospitals" (super admin).
export function hospitalScope(user: AuthUser): string | null {
  return user.role === 'super_admin' ? null : requireHospital(user);
}

export function requireHospital(user: AuthUser): string {
  if (!user.hospitalId) {
    throw new ForbiddenException('Your account is not linked to a hospital');
  }
  return user.hospitalId;
}
