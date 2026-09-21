import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { get, post, del } from './client';
import type { TipEntry, TipEntryDetail, TipEntryInput, TipPreviewResponse } from '../types';
import { dayBefore } from '../utils/dates';

export interface PublishResult { emailsSent: number; emailsFailed: number; }

// Newest first, from `since` onward. 100 is the API's page maximum, so callers should tell the
// user when that many come back (there may be more).
export const TIP_ENTRIES_LIMIT = 100;

export const useTipEntries = (since: string) =>
  useQuery({
    queryKey: ['tipEntries', 'list', since],
    queryFn: () => get<TipEntry[]>(`/tips/entries?start_date=${since}&limit=${TIP_ENTRIES_LIMIT}`),
    enabled: !!since,
    placeholderData: keepPreviousData,
  });

// Entries older than the list window that were never published: easy to forget once they scroll out of view.
export const useOlderDrafts = (since: string) =>
  useQuery({
    queryKey: ['tipEntries', 'older', since],
    queryFn: () => get<TipEntry[]>(`/tips/entries?end_date=${dayBefore(since)}&limit=${TIP_ENTRIES_LIMIT}`),
    enabled: !!since,
    select: (entries) => entries.filter((e) => !e.publishedAt),
  });

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

export const usePublishTipEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<PublishResult>(`/tips/entries/${id}/publish`),
    onSuccess: (_data, id) => qc.invalidateQueries({ queryKey: ['tipEntries', id] }),
  });
};
