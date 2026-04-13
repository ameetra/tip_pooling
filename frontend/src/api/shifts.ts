import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from './client';
import type { Shift } from '../types';

export const useShifts = () =>
  useQuery({ queryKey: ['shifts'], queryFn: () => get<Shift[]>('/shifts') });

export const useCreateShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => post<Shift>('/shifts', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  });
};

export const useUpdateShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; isActive?: boolean } }) =>
      patch<Shift>(`/shifts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  });
};

export const useDeleteShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/shifts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  });
};
