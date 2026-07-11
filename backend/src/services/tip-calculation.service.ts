import {
  EmployeeResult,
  EmployeeRole,
  StintInput,
  StintResult,
  SupportStaffConfig,
  TipCalculationInput,
  TipCalculationResult,
  isTipped,
} from '../types/tip-calculation.types';

const round2 = (n: number) => Number(n.toFixed(2));

export class TipCalculationError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'TipCalculationError';
  }
}

function validate(input: TipCalculationInput): void {
  const { totalTipPool, stints } = input;

  if (totalTipPool < 0) {
    throw new TipCalculationError('Total tip pool cannot be negative', 'NEGATIVE_TIP_POOL');
  }

  if (stints.length === 0) {
    throw new TipCalculationError('At least one employee is required', 'NO_EMPLOYEES');
  }

  const tippedHours = stints.filter((s) => isTipped(s.role)).reduce((sum, s) => sum + s.hours, 0);
  if (!stints.some((s) => isTipped(s.role))) {
    throw new TipCalculationError('At least one server or shift lead is required', 'NO_SERVERS');
  }
  if (tippedHours <= 0) {
    throw new TipCalculationError('Total server/shift-lead hours must be greater than zero', 'ZERO_SERVER_HOURS');
  }

  const stintKeys = new Set<string>();
  const hoursByEmployee = new Map<string, number>();
  for (const s of stints) {
    const key = `${s.employeeId}:${s.role}`;
    if (stintKeys.has(key)) {
      throw new TipCalculationError(`Duplicate stint for ${s.name} as ${s.role}`, 'DUPLICATE_STINT');
    }
    stintKeys.add(key);

    if (s.hours < 0.5 || s.hours > 16) {
      throw new TipCalculationError(`${s.name} has invalid hours: ${s.hours} (must be 0.5-16)`, 'INVALID_HOURS');
    }
    if (!Number.isFinite(s.hourlyRate) || s.hourlyRate < 0) {
      throw new TipCalculationError(`${s.name} has an invalid rate for ${s.role}`, 'INVALID_RATE');
    }
    hoursByEmployee.set(s.employeeId, (hoursByEmployee.get(s.employeeId) ?? 0) + s.hours);
  }

  for (const [, total] of hoursByEmployee) {
    if (total > 16) {
      const s = stints.find((x) => (hoursByEmployee.get(x.employeeId) ?? 0) > 16)!;
      throw new TipCalculationError(`${s.name} works ${total} hours total (max 16/day)`, 'EMPLOYEE_HOURS_EXCEEDED');
    }
  }
}

export function calculateTips(input: TipCalculationInput): TipCalculationResult {
  validate(input);

  const { totalTipPool, stints, supportStaffConfig } = input;
  const pctByRole = new Map<string, number>(supportStaffConfig.map((c) => [c.role, c.percentage / 100]));

  const tippedStints = stints.filter((s) => isTipped(s.role));
  const supportStints = stints.filter((s) => !isTipped(s.role));
  const totalTippedHours = tippedStints.reduce((sum, s) => sum + s.hours, 0);

  // Support roles actually present today, and their share of the pool.
  const presentSupportRoles = [...new Set(supportStints.map((s) => s.role))];
  const totalSupportPct = presentSupportRoles.reduce((sum, role) => sum + (pctByRole.get(role) ?? 0), 0);
  if (totalSupportPct >= 1) {
    throw new TipCalculationError(
      'Support percentages total 100% or more, leaving nothing for servers',
      'SUPPORT_PERCENT_TOO_HIGH',
    );
  }

  const tippedPool = round2(totalTipPool * (1 - totalSupportPct));

  // Tipped earners (servers + shift leads): gross prorated share, then deduct the support take
  // (off the top, prorated by hours). Tip share ignores base wage, so shift leads split exactly like servers.
  const tippedResults = tippedStints.map((s) => {
    const gross = (s.hours / totalTippedHours) * totalTipPool;
    const baseTips = round2(gross);
    const finalTips = round2(gross * (1 - totalSupportPct));
    const supportTipsGiven = round2(baseTips - finalTips);
    return buildStint(s, { baseTips, supportTipsGiven, supportTipsReceived: 0, finalTips });
  });

  // Support: each role's pool (pct x total) split among that role's stints by hours.
  const supportResults = supportStints.map((s) => {
    const pct = pctByRole.get(s.role) ?? 0;
    const roleHours = supportStints.filter((x) => x.role === s.role).reduce((sum, x) => sum + x.hours, 0);
    const rolePool = totalTipPool * pct;
    const received = round2((s.hours / roleHours) * rolePool);
    return buildStint(s, { baseTips: 0, supportTipsGiven: 0, supportTipsReceived: received, finalTips: received, supportPct: pct });
  });

  // Day-wide cap: no support stint earns more in tips than the top-earning tipped stint.
  applyCap(tippedResults, supportResults, totalTippedHours);

  const all = [...tippedResults, ...supportResults];

  // Rounding: ensure total distributed == pool exactly (within $0.01); remainder to highest earner.
  const distributed = all.reduce((sum, r) => sum + r.finalTips, 0);
  const diff = round2(totalTipPool - distributed);
  if (Math.abs(diff) >= 0.01) {
    const top = all.reduce((max, r) => (r.finalTips > max.finalTips ? r : max));
    top.finalTips = round2(top.finalTips + diff);
    top.totalPay = round2(top.wage + top.finalTips);
  }

  void tippedPool; // tippedPool is implied by the per-stint math above; kept for clarity

  return { stints: all, employees: aggregateByEmployee(all) };
}

function applyCap(tipped: StintResult[], support: StintResult[], totalTippedHours: number): void {
  if (tipped.length === 0) return;
  const highestTippedTip = Math.max(...tipped.map((s) => s.finalTips));

  for (const sup of support) {
    if (sup.finalTips <= highestTippedTip) continue;
    const excess = round2(sup.finalTips - highestTippedTip);
    sup.supportTipsReceived = highestTippedTip;
    sup.finalTips = highestTippedTip;
    sup.totalPay = round2(sup.wage + sup.finalTips);

    // Return excess to tipped earners, prorated by their hours.
    tipped.forEach((t) => {
      const refund = round2((t.hours / totalTippedHours) * excess);
      t.finalTips = round2(t.finalTips + refund);
      t.supportTipsGiven = round2(t.supportTipsGiven - refund);
      t.totalPay = round2(t.wage + t.finalTips);
    });
  }
}

function buildStint(
  s: StintInput,
  tips: { baseTips: number; supportTipsGiven: number; supportTipsReceived: number; finalTips: number; supportPct?: number },
): StintResult {
  const wage = round2(s.hours * s.hourlyRate);
  return {
    employeeId: s.employeeId,
    name: s.name,
    role: s.role,
    hours: s.hours,
    hourlyRate: s.hourlyRate,
    wage,
    baseTips: round2(tips.baseTips),
    supportTipsGiven: round2(tips.supportTipsGiven),
    supportTipsReceived: round2(tips.supportTipsReceived),
    finalTips: round2(tips.finalTips),
    totalPay: round2(wage + tips.finalTips),
    supportPct: tips.supportPct ?? 0,
  };
}

function aggregateByEmployee(stints: StintResult[]): EmployeeResult[] {
  const byEmployee = new Map<string, StintResult[]>();
  for (const s of stints) {
    const list = byEmployee.get(s.employeeId) ?? [];
    list.push(s);
    byEmployee.set(s.employeeId, list);
  }

  return [...byEmployee.values()].map((empStints) => {
    const totalHours = empStints.reduce((sum, s) => sum + s.hours, 0);
    const totalWage = round2(empStints.reduce((sum, s) => sum + s.wage, 0));
    const totalTips = round2(empStints.reduce((sum, s) => sum + s.finalTips, 0));
    const totalPay = round2(totalWage + totalTips);
    return {
      employeeId: empStints[0].employeeId,
      name: empStints[0].name,
      roles: [...new Set(empStints.map((s) => s.role))] as EmployeeRole[],
      totalHours: round2(totalHours),
      totalWage,
      totalTips,
      totalPay,
      effectiveHourlyRate: totalHours > 0 ? round2(totalPay / totalHours) : 0,
      stints: empStints,
    };
  });
}

/** Cash tips from the two cash sources: drawer overage + tip jar. Overage may be negative (register short). */
export function computeCashTips(cashInRegister: number, cashSales: number, cashTips: number): number {
  return round2((cashInRegister - cashSales) + cashTips);
}
