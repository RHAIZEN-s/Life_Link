import { toBadges, toStatsDto } from './profile.service';

const base = {
  total_donations: 0,
  verified_donations: 0,
  last_donation_on: null,
  next_eligible_on: null,
  accepted_responses: 0,
  points: 0,
};

describe('donor stats', () => {
  it('treats a donor with no history as eligible', () => {
    expect(toStatsDto(base).isEligible).toBe(true);
  });

  it('is not eligible before the next eligible date', () => {
    const future = new Date(Date.now() + 5 * 86400000)
      .toISOString()
      .slice(0, 10);
    expect(toStatsDto({ ...base, next_eligible_on: future }).isEligible).toBe(
      false,
    );
  });

  it('is eligible on or after the next eligible date', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(toStatsDto({ ...base, next_eligible_on: today }).isEligible).toBe(
      true,
    );
  });

  it('awards badges from verified donations and accepted requests', () => {
    const earned = (stats: typeof base) =>
      toBadges(stats)
        .filter((b) => b.earned)
        .map((b) => b.id);

    expect(earned(base)).toEqual([]);
    expect(earned({ ...base, verified_donations: 1 })).toEqual([
      'first_donation',
    ]);
    expect(
      earned({ ...base, verified_donations: 10, accepted_responses: 3 }),
    ).toEqual([
      'first_donation',
      'five_donations',
      'top_donor',
      'community_hero',
    ]);
  });
});
