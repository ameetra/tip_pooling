import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from './client';
import type { SupportStaffConfig } from '../types';

// Percentages in force today, one per role.
export const useSupportConfig = () =>
  useQuery({ queryKey: ['supportConfig'], queryFn: () => get<SupportStaffConfig[]>('/config/support-staff') });

// Every change ever made, including ones scheduled for a future date.
export const useSupportConfigHistory = () =>
  useQuery({ queryKey: ['supportConfig', 'history'], queryFn: () => get<SupportStaffConfig[]>('/config/support-staff/history?limit=100') });

export const useSetSupportConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (configs: { role: 'BUSSER' | 'EXPEDITOR'; percentage: number; effectiveDate: string }[]) =>
      post<SupportStaffConfig[]>('/config/support-staff', { configs }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supportConfig'] }),
  });
};
