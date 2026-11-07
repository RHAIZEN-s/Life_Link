import type {
  BloodGroup,
  OrganType,
  RequestPriority,
} from '../types/database.types';

// Mirrors public.blood_compatible() in SQL.
// Red cells: the donor's ABO antigens must be a subset of the recipient's, and
// Rh-negative recipients need Rh-negative donors. Solid organs only need ABO.
export function bloodCompatible(
  donor: BloodGroup | null | undefined,
  recipient: BloodGroup | null | undefined,
  ignoreRh = false,
): boolean {
  if (!donor || !recipient) return false;
  const donorAbo = donor.slice(0, -1);
  const rhOk = ignoreRh || donor.endsWith('-') || recipient.endsWith('+');
  const aOk = !donorAbo.includes('A') || recipient.includes('A');
  const bOk = !donorAbo.includes('B') || recipient.includes('B');
  return rhOk && aOk && bOk;
}

// ABO matters for solid organs; corneas and marrow are matched differently.
export function organNeedsAbo(organ: OrganType | null | undefined) {
  return organ !== 'eyes' && organ !== 'bone_marrow';
}

// How far and how many donors a new request alerts, by urgency.
export const ALERT_POLICY: Record<
  RequestPriority,
  { radiusKm: number; maxDonors: number }
> = {
  urgent: { radiusKm: 50, maxDonors: 100 },
  high: { radiusKm: 30, maxDonors: 50 },
  medium: { radiusKm: 20, maxDonors: 25 },
  low: { radiusKm: 10, maxDonors: 10 },
};

// Units recorded per completed appointment when not specified.
export const DEFAULT_UNITS_PER_DONATION = 1;

// Spam guard: active requests one person may have at a time.
export const MAX_ACTIVE_REQUESTS_PER_USER = 5;
