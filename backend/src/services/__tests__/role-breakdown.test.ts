import { roleBreakdown } from '../role-breakdown';

const stint = (roleOnDay: string, totalHours: number, finalTips: number) => ({ roleOnDay, totalHours, finalTips });

describe('roleBreakdown', () => {
  it('lists each role once with its hours and tips, in the order roles first appear', () => {
    expect(roleBreakdown([stint('SERVER', 4, 133.33), stint('BUSSER', 4, 100)])).toEqual([
      { role: 'Server', hours: 4, tips: 133.33 },
      { role: 'Busser', hours: 4, tips: 100 },
    ]);
  });

  it('combines repeated stints of the same role', () => {
    expect(roleBreakdown([stint('SERVER', 2.25, 10.1), stint('SERVER', 1.75, 5.2)])).toEqual([
      { role: 'Server', hours: 4, tips: 15.3 },
    ]);
  });

  it('uses display names for multi-word roles', () => {
    expect(roleBreakdown([stint('SHIFT_LEAD', 8, 90)])[0].role).toBe('Shift Lead');
  });

  it("uses the venue's role names when set, and defaults for the rest", () => {
    expect(roleBreakdown([stint('SERVER', 4, 80), stint('BUSSER', 2, 10)], { SERVER: 'Barista' }).map((r) => r.role))
      .toEqual(['Barista', 'Busser']);
  });

  it('returns nothing when there are no stints', () => {
    expect(roleBreakdown([])).toEqual([]);
  });
});
