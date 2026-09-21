import { useQuery } from '@tanstack/react-query';
import { get } from './client';
import type { PayrollReport } from '../types';

export const usePayrollReport = (startDate: string, endDate: string) =>
  useQuery({
    queryKey: ['payrollReport', startDate, endDate],
    queryFn: () => get<PayrollReport>(`/tips/payroll-report?start_date=${startDate}&end_date=${endDate}`),
    enabled: !!startDate && !!endDate,
  });
