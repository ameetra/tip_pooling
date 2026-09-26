import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, patch } from './client';
import type { ShiftHoursConfig, ShiftHoursDay } from '../types';

// Support-split mode + day-of-week "Total Shift Hours" defaults. Only meaningful for PER_PERSON
// tenants, but harmless (and cheap) to fetch unconditionally.
export const useShiftHoursConfig = () =>
  useQuery({ queryKey: ['shiftHoursConfig'], queryFn: () => get<ShiftHoursConfig>('/config/shift-hours') });

export const useSetShiftHoursDefaults = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (defaults: Record<ShiftHoursDay, number | null>) => patch<ShiftHoursConfig>('/config/shift-hours', defaults),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shiftHoursConfig'] }),
  });
};
