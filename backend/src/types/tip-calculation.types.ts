export type EmployeeRole = 'SERVER' | 'BUSSER' | 'EXPEDITOR';
export type SupportRole = 'BUSSER' | 'EXPEDITOR';

// One role-stint: an employee working a given role for some hours at a given base rate.
// The same employee may have multiple stints in a day (e.g. server in the morning, busser later).
export interface StintInput {
  employeeId: string;
  name: string;
  role: EmployeeRole;
  hours: number;
  hourlyRate: number; // base rate for THIS role
}

export interface SupportStaffConfig {
  role: SupportRole;
  percentage: number; // 0-50, whole number (20 = 20%)
}

export interface TipCalculationInput {
  totalTipPool: number;
  stints: StintInput[];
  supportStaffConfig: SupportStaffConfig[];
}

// Per-stint result (one per employee+role). Persisted as a tip_calculations row.
export interface StintResult {
  employeeId: string;
  name: string;
  role: EmployeeRole;
  hours: number;
  hourlyRate: number;
  wage: number;                // hours * hourlyRate
  baseTips: number;            // server: gross prorated share (before support deduction); support: 0
  supportTipsGiven: number;    // server: portion routed to support; support: 0
  supportTipsReceived: number; // support: portion received (after cap); server: 0
  finalTips: number;           // net tips for this stint
  totalPay: number;            // wage + finalTips
  supportPct: number;          // role's configured % (support stints only), for snapshotting
}

// Per-employee aggregate — the headline view (one $/hr line per employee per day).
export interface EmployeeResult {
  employeeId: string;
  name: string;
  roles: EmployeeRole[];
  totalHours: number;
  totalWage: number;
  totalTips: number;
  totalPay: number;
  effectiveHourlyRate: number; // totalPay / totalHours
  stints: StintResult[];
}

export interface TipCalculationResult {
  stints: StintResult[];
  employees: EmployeeResult[];
}
