export type EmployeeRole = 'SERVER' | 'BUSSER' | 'EXPEDITOR';
export type SupportRole = 'BUSSER' | 'EXPEDITOR';

export interface Employee {
  id: string;
  name: string;
  roleOnDay: EmployeeRole;
  shifts: string[];
  hoursWorked: number;
  hourlyRate: number;
}

export interface SupportStaffConfig {
  role: SupportRole;
  percentage: number; // 0-50, stored as whole number (e.g., 20 = 20%)
}

export interface TipCalculationInput {
  totalTipPool: number;
  employees: Employee[];
  supportStaffConfig: SupportStaffConfig[];
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
