import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from './client';
import type { TipEntry, TipEntryDetail, TipEntryInput, TipPreviewResponse } from '../types';

export const useTipEntries = () =>
  useQuery({ queryKey: ['tipEntries'], queryFn: () => get<TipEntry[]>('/tips/entries') });

export const useTipEntry = (id: string) =>
  useQuery({ queryKey: ['tipEntries', id], queryFn: () => get<TipEntryDetail>(`/tips/entries/${id}`), enabled: !!id });

export const useTipPreview = () =>
  useMutation({ mutationFn: (data: TipEntryInput) => post<TipPreviewResponse>('/tips/preview', data) });

export const useCreateTipEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TipEntryInput) => post('/tips/entries', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipEntries'] }),
  });
};

export const useDeleteTipEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/tips/entries/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipEntries'] }),
  });
};
