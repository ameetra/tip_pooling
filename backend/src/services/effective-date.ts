// Shared "as of" lookup for effective-dated records (support-staff %, wage history).

export const toDateString = (d: Date) => d.toISOString().slice(0, 10);

// Today's calendar date (YYYY-MM-DD) in the venue's timezone.
export const todayIn = (timeZone: string) => new Date().toLocaleDateString('en-CA', { timeZone });

// The record in force on `date`: the newest one effective on/before it. If `date` predates every
// record (e.g. backfilling old days), the earliest one applies. Ties on effective date go to the
// most recently entered record, so a correction beats the row it corrects.
export function pickAsOf<T extends { createdAt: Date }>(rows: T[], date: string, effective: (r: T) => string): T | undefined {
  const newestFirst = [...rows].sort(
    (a, b) => effective(b).localeCompare(effective(a)) || b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const earliest = newestFirst.length ? effective(newestFirst[newestFirst.length - 1]) : '';
  return newestFirst.find((r) => effective(r) <= date) ?? newestFirst.find((r) => effective(r) === earliest);
}
