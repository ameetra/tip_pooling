import { formatRole } from '../types/tip-calculation.types';

export interface RoleBreakdown { role: string; hours: number; tips: number }

const round2 = (n: number) => Number(n.toFixed(2));

// Per-role hours and tips for one person's stints, in the order the roles first appear.
// `role` is display-ready ("Server"), so email and history show the same text.
export function roleBreakdown(stints: { roleOnDay: string; totalHours: number; finalTips: number }[]): RoleBreakdown[] {
  const byRole = new Map<string, RoleBreakdown>();
  for (const s of stints) {
    const row = byRole.get(s.roleOnDay) ?? { role: formatRole(s.roleOnDay), hours: 0, tips: 0 };
    row.hours += s.totalHours;
    row.tips += s.finalTips;
    byRole.set(s.roleOnDay, row);
  }
  return [...byRole.values()].map((r) => ({ ...r, hours: round2(r.hours), tips: round2(r.tips) }));
}
