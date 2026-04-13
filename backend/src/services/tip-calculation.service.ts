import {
  Employee,
  SupportStaffConfig,
  TipCalculationInput,
  TipCalculationResult,
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
  const { totalTipPool, employees } = input;

  if (totalTipPool < 0) {
    throw new TipCalculationError('Total tip pool cannot be negative', 'NEGATIVE_TIP_POOL');
  }

  const servers = employees.filter((e) => e.roleOnDay === 'SERVER');
  if (servers.length === 0) {
    throw new TipCalculationError('At least one server is required', 'NO_SERVERS');
  }

  const totalServerHours = servers.reduce((sum, s) => sum + s.hoursWorked, 0);
  if (totalServerHours <= 0) {
    throw new TipCalculationError(
      'Total server hours must be greater than zero',
      'ZERO_SERVER_HOURS',
    );
  }

  const ids = new Set<string>();
  for (const emp of employees) {
    if (ids.has(emp.id)) {
      throw new TipCalculationError(
        `Duplicate employee: ${emp.id}`,
        'DUPLICATE_EMPLOYEE',
      );
    }
    ids.add(emp.id);

    if (emp.hoursWorked < 0.5 || emp.hoursWorked > 16) {
      throw new TipCalculationError(
        `Employee ${emp.name} has invalid hours: ${emp.hoursWorked} (must be 0.5-16)`,
        'INVALID_HOURS',
      );
    }
  }
}

export function calculateTips(input: TipCalculationInput): TipCalculationResult[] {
  validate(input);

  const { totalTipPool, employees, supportStaffConfig } = input;
  const servers = employees.filter((e) => e.roleOnDay === 'SERVER');
  const supportStaff = employees.filter((e) => e.roleOnDay !== 'SERVER');
  const totalServerHours = servers.reduce((sum, s) => sum + s.hoursWorked, 0);

  // Step 1: Prorate tips to servers based on hours
  const serverCalcs = servers.map((server) => ({
    employee: server,
    baseTips: round2((server.hoursWorked / totalServerHours) * totalTipPool),
    supportTipsGiven: 0,
    finalTips: 0, // set after support deductions
  }));

  // Initialize finalTips = baseTips
  serverCalcs.forEach((sc) => (sc.finalTips = sc.baseTips));

  // Step 2: Calculate support staff tips
  const supportCalcs = supportStaff.map((support) => {
    const config = supportStaffConfig.find((c) => c.role === support.roleOnDay);
    const pct = config ? config.percentage / 100 : 0;

    let supportTips = 0;

    // Find servers on shared shifts and calculate percentage
    serverCalcs.forEach((sc) => {
      const sharedShifts = sc.employee.shifts.filter((s) => support.shifts.includes(s));
      if (sharedShifts.length === 0) return;

      const serverTotalShifts = sc.employee.shifts.length;
      const serverTipsPerShift = sc.baseTips / serverTotalShifts;
      const tipsFromSharedShifts = serverTipsPerShift * sharedShifts.length;
      const tipsFromThisServer = round2(tipsFromSharedShifts * pct);

      supportTips += tipsFromThisServer;
      sc.supportTipsGiven = round2(sc.supportTipsGiven + tipsFromThisServer);
      sc.finalTips = round2(sc.finalTips - tipsFromThisServer);
    });

    supportTips = round2(supportTips);
    return { employee: support, supportTips };
  });

  // Step 3: Cap enforcement - support staff cannot exceed highest server on their shifts
  supportCalcs.forEach((sc) => {
    const serversOnSameShifts = serverCalcs.filter((svr) =>
      svr.employee.shifts.some((s) => sc.employee.shifts.includes(s)),
    );
    if (serversOnSameShifts.length === 0) return;

    const highestServerTip = Math.max(...serversOnSameShifts.map((s) => s.finalTips));
    if (sc.supportTips > highestServerTip) {
      // Refund excess back to servers proportionally
      const excess = round2(sc.supportTips - highestServerTip);
      sc.supportTips = highestServerTip;

      // Distribute excess back to servers on shared shifts proportionally
      const totalGiven = serversOnSameShifts.reduce((sum, s) => sum + s.supportTipsGiven, 0);
      if (totalGiven > 0) {
        serversOnSameShifts.forEach((svr) => {
          const refund = round2((svr.supportTipsGiven / totalGiven) * excess);
          svr.finalTips = round2(svr.finalTips + refund);
          svr.supportTipsGiven = round2(svr.supportTipsGiven - refund);
        });
      }
    }
  });

  // Step 4: Build results
  const results: TipCalculationResult[] = [
    ...serverCalcs.map((sc) => buildResult(sc.employee, sc.baseTips, sc.supportTipsGiven, 0)),
    ...supportCalcs.map((sc) => buildResult(sc.employee, 0, 0, sc.supportTips)),
  ];

  // Step 5: Rounding remainder - ensure total distributed === tip pool
  const totalDistributed = results.reduce((sum, r) => sum + r.finalTips, 0);
  const roundingDiff = round2(totalTipPool - totalDistributed);
  if (Math.abs(roundingDiff) >= 0.01) {
    const highestEarner = results.reduce((max, r) => (r.finalTips > max.finalTips ? r : max));
    highestEarner.finalTips = round2(highestEarner.finalTips + roundingDiff);
    highestEarner.totalPay = round2(highestEarner.hourlyPay + highestEarner.finalTips);
    highestEarner.effectiveHourlyRate = round2(
      highestEarner.totalPay / highestEarner.hoursWorked,
    );
  }

  return results;
}

function buildResult(
  employee: Employee,
  baseTips: number,
  supportTipsGiven: number,
  supportTipsReceived: number,
): TipCalculationResult {
  const finalTips = round2(baseTips - supportTipsGiven + supportTipsReceived);
  const hourlyPay = round2(employee.hoursWorked * employee.hourlyRate);
  const totalPay = round2(hourlyPay + finalTips);
  return {
    employeeId: employee.id,
    name: employee.name,
    roleOnDay: employee.roleOnDay,
    shifts: employee.shifts,
    hoursWorked: employee.hoursWorked,
    hourlyPay,
    baseTips: round2(baseTips),
    supportTipsGiven: round2(supportTipsGiven),
    supportTipsReceived: round2(supportTipsReceived),
    finalTips,
    totalPay,
    effectiveHourlyRate: round2(totalPay / employee.hoursWorked),
  };
}

/** Cash tips formula: closing_drawer - starting_drawer - cash_sales */
export function calculateCashTips(
  closingDrawer: number,
  startingDrawer: number,
  cashSales: number = 0,
): number {
  if (closingDrawer < startingDrawer) {
    throw new TipCalculationError(
      'Closing drawer cannot be less than starting drawer',
      'INVALID_DRAWER',
    );
  }
  return round2(closingDrawer - startingDrawer - cashSales);
}
