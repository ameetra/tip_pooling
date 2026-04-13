import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from './client';
import type { SupportStaffConfig } from '../types';

export const useSupportConfig = () =>
  useQuery({ queryKey: ['supportConfig'], queryFn: () => get<SupportStaffConfig[]>('/config/support-staff') });

export const useSetSupportConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (configs: { role: 'BUSSER' | 'EXPEDITOR'; percentage: number }[]) =>
      post<SupportStaffConfig[]>('/config/support-staff', { configs }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supportConfig'] }),
  });
};
