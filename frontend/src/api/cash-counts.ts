import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { get, post, put, del } from './client';
import type { CashCount, CashCountInput, CashCountRow } from '../types';

// Drops from `since` onward plus older uncounted ones; a deposit instead lists that deposit's drops.
export const useCashCounts = (since: string, deposit: string) =>
  useQuery({
    queryKey: ['cashCounts', since, deposit],
    queryFn: () => get<CashCountRow[]>(`/cash-counts?${deposit ? `deposit=${encodeURIComponent(deposit)}` : `from=${since}`}`),
    enabled: !!(since || deposit),
    placeholderData: keepPreviousData,
  });

export const useSaveCashCount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entryDate, ...data }: CashCountInput & { id?: string; entryDate: string }) =>
      id ? put<CashCount>(`/cash-counts/${id}`, data) : post<CashCount>('/cash-counts', { entryDate, ...data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cashCounts'] }),
  });
};

export const useDeleteCashCount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/cash-counts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cashCounts'] }),
  });
};
