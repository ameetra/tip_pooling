import type { DeleteReason } from '../types';

export const DELETE_REASON_LABELS: Record<DeleteReason, string> = {
  WRONG_HOURS: 'Wrong hours',
  WRONG_EMPLOYEES: 'Missing or extra employee',
  WRONG_TIPS: 'Wrong tip amounts',
  WRONG_DATE: 'Wrong date',
  OTHER: 'Other',
};

export const poolTitle = (entryDate: string, poolName?: string) => (poolName ? `${entryDate} – ${poolName}` : entryDate);

// What to tell a manager before deleting a tip entry. A published entry has already been emailed to staff and
// counted in payroll, so deleting it changes numbers people have seen (this is also how corrections are made).
export const deleteEntryMessage = (entry?: { entryDate: string; poolName?: string; publishedAt: string | null }) =>
  entry?.publishedAt
    ? `This entry was published and emailed to staff. Deleting it changes payroll totals for ${poolTitle(entry.entryDate, entry.poolName)}. Note the current amounts first.`
    : `This will soft-delete the entry${entry?.poolName ? ` for ${poolTitle(entry.entryDate, entry.poolName)}` : ''}.`;
