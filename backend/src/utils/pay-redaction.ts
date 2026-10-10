import { Request } from 'express';
import { EmployeeResult } from '../types/tip-calculation.types';

// Shift leads enter tips but must not learn anyone's wages, so pay is stripped server-side
// (hiding it only in the UI still exposed it in the browser's network tab).
export const hidesPay = (req: Request) => req.user?.role === 'SHIFT_LEAD';

export const tipsOnly = (results: EmployeeResult[]) =>
  results.map(({ employeeId, name, roles, totalHours, totalTips }) => ({ employeeId, name, roles, totalHours, totalTips }));

export const withoutRates = <T extends { hourlyRate?: number; roleRates?: { role: string }[] }>({ hourlyRate: _rate, roleRates, ...e }: T) =>
  ({ ...e, roleRates: roleRates?.map(({ role }) => ({ role })) });
