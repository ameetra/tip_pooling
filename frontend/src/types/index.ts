export type EmployeeRole = 'SERVER' | 'BUSSER' | 'EXPEDITOR';

export interface EmployeeRateHistory {
  id: string;
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
  hourlyRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rateHistory?: EmployeeRateHistory[];
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  role: EmployeeRole;
  hourlyRate: number;
}

export interface UpdateEmployeeInput {
  name?: string;
  email?: string;
  role?: EmployeeRole;
  isActive?: boolean;
}

export interface UpdateRateInput {
  hourlyRate: number;
  effectiveDate?: string;
}

export interface Shift {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  startingDrawer: number;
  closingDrawer: number;
  cashSales: number;
  electronicTips: number;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TipCalculationResult {
  employeeId: string;
  name: string;
  roleOnDay: EmployeeRole;
  shifts: string[];
  hoursWorked: number;
  hourlyPay: number;
  baseTips: number;
  supportTipsGiven: number;
  supportTipsReceived: number;
  finalTips: number;
  totalPay: number;
  effectiveHourlyRate: number;
}

export interface TipPreviewResponse {
  entryDate: string;
  cashTips: number;
  electronicTips: number;
  totalTipPool: number;
  results: TipCalculationResult[];
}

export interface EmployeeShiftEntry {
  employeeId: string;
  roleOnDay: EmployeeRole;
  hoursWorked: number;
  shiftIds: string[];
}

export interface TipEntryInput {
  entryDate: string;
  startingDrawer: number;
  closingDrawer: number;
  cashSales: number;
  electronicTips: number;
  employees: EmployeeShiftEntry[];
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
    shiftAssignments: { shift: { id: string; name: string } }[];
  }[];
}
