export type EmployeeRole = 'SERVER' | 'SHIFT_LEAD' | 'BUSSER' | 'EXPEDITOR';

export interface EmployeeRoleRate {
  id: string;
  role: EmployeeRole;
  hourlyRate: number;
}

export interface EmployeeRateHistory {
  id: string;
  role: EmployeeRole;
  hourlyRate: number;
  effectiveDate: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: EmployeeRole;
  hourlyRate: number; // legacy primary-role rate
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roleRates?: EmployeeRoleRate[];
  rateHistory?: EmployeeRateHistory[];
}

export interface RoleRateInput {
  role: EmployeeRole;
  hourlyRate: number;
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  role: EmployeeRole;
  rates: RoleRateInput[];
}

export interface UpdateEmployeeInput {
  name?: string;
  email?: string;
  role?: EmployeeRole;
  isActive?: boolean;
}

export interface SetRoleRatesInput {
  rates: RoleRateInput[];
  effectiveDate?: string;
}

export interface SupportStaffConfig {
  id: string;
  tenantId: string;
  role: 'BUSSER' | 'EXPEDITOR';
  percentage: number;
  effectiveDate: string;
  createdAt: string;
}

export interface TipEntry {
  id: string;
  tenantId: string;
  entryDate: string;
  cashInRegister: number;
  cashSales: number;
  cashTips: number;
  posTips: number;
  isDeleted: boolean;
  deletedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Per-role stint within a calculation result.
export interface StintResult {
  employeeId: string;
  name: string;
  role: EmployeeRole;
  hours: number;
  hourlyRate: number;
  wage: number;
  baseTips: number;
  supportTipsGiven: number;
  supportTipsReceived: number;
  finalTips: number;
  totalPay: number;
}

// Per-employee aggregate — one row per employee per day.
export interface EmployeeResult {
  employeeId: string;
  name: string;
  roles: EmployeeRole[];
  totalHours: number;
  totalWage: number;
  totalTips: number;
  totalPay: number;
  effectiveHourlyRate: number;
  stints: StintResult[];
}

export interface TipPreviewResponse {
  entryDate: string;
  cashTips: number;
  posTips: number;
  totalTipPool: number;
  results: EmployeeResult[];
}

export interface EmployeeStintEntry {
  employeeId: string;
  role: EmployeeRole;
  hoursWorked: number;
}

export interface TipEntryInput {
  entryDate: string;
  cashInRegister: number;
  cashSales: number;
  cashTips: number;
  posTips: number;
  employees: EmployeeStintEntry[];
}

export interface TipEntryDetail extends TipEntry {
  tipCalculations: {
    id: string;
    employeeId: string;
    roleOnDay: string;
    totalHours: number;
    hourlyPay: number;
    baseTips: number;
    supportTipsGiven: number;
    supportTipsReceived: number;
    finalTips: number;
    totalPay: number;
    effectiveHourlyRate: number;
    employee: { id: string; name: string; email: string; role: string };
  }[];
}
