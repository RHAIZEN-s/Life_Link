import { bloodCompatible, organNeedsAbo } from './matching';
import type { BloodGroup } from '../types/database.types';

const ALL: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Standard red-cell compatibility: recipient → acceptable donors.
const RECEIVES_FROM: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ALL,
};

describe('bloodCompatible', () => {
  it.each(ALL)(
    'matches the transfusion chart for %s recipients',
    (recipient) => {
      const donors = ALL.filter((donor) => bloodCompatible(donor, recipient));
      expect(donors.sort()).toEqual([...RECEIVES_FROM[recipient]].sort());
    },
  );

  it('treats O- as the universal donor and AB+ as the universal recipient', () => {
    expect(ALL.every((r) => bloodCompatible('O-', r))).toBe(true);
    expect(ALL.every((d) => bloodCompatible(d, 'AB+'))).toBe(true);
  });

  it('ignores Rh for solid organs', () => {
    expect(bloodCompatible('A+', 'A-')).toBe(false);
    expect(bloodCompatible('A+', 'A-', true)).toBe(true);
    expect(bloodCompatible('B+', 'A-', true)).toBe(false);
  });

  it('is false when either group is unknown', () => {
    expect(bloodCompatible(null, 'A+')).toBe(false);
    expect(bloodCompatible('O-', undefined)).toBe(false);
  });

  it('knows which organs need ABO matching', () => {
    expect(organNeedsAbo('kidney')).toBe(true);
    expect(organNeedsAbo('eyes')).toBe(false);
    expect(organNeedsAbo('bone_marrow')).toBe(false);
  });
});
