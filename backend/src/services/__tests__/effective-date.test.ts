import { pickAsOf } from '../effective-date';

const row = (effectiveDate: string, value: number, createdAt = 0) => ({ effectiveDate, value, createdAt: new Date(createdAt) });
const pick = (rows: ReturnType<typeof row>[], date: string) => pickAsOf(rows, date, (r) => r.effectiveDate)?.value;

describe('pickAsOf', () => {
  const rows = [row('2026-01-01', 10), row('2026-10-01', 20)];

  it('uses the newest record effective on or before the date', () => {
    expect(pick(rows, '2026-09-30')).toBe(10);
    expect(pick(rows, '2026-10-01')).toBe(20);
    expect(pick(rows, '2027-03-01')).toBe(20);
  });

  it('falls back to the earliest record when the date predates all of them', () => {
    expect(pick(rows, '2025-06-01')).toBe(10);
  });

  it('prefers the most recently entered record when effective dates tie', () => {
    expect(pick([row('2026-05-01', 1, 100), row('2026-05-01', 2, 200)], '2026-06-01')).toBe(2);
    expect(pick([row('2026-05-01', 1, 100), row('2026-05-01', 2, 200)], '2026-01-01')).toBe(2);
  });

  it('returns undefined when there are no records', () => {
    expect(pick([], '2026-06-01')).toBeUndefined();
  });
});
