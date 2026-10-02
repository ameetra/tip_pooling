import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { get, post, patch, del } from './client';
import type { DeletedEntriesReport, DeleteReason, TipEntry, TipEntryDetail, TipEntryInput, TipPreviewResponse } from '../types';
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

// Edit replaces the draft with a new entry (new id); the old one is soft-deleted server-side.
// The date can't change on edit: the server keeps the original and ignores entryDate.
export const useEditTipEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TipEntryInput }) => patch<TipEntry>(`/tips/entries/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipEntries'] }),
  });
};

export const useDeleteTipEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    // Published entries need a reason (the server rejects deleting one without it); drafts don't.
    mutationFn: ({ id, why }: { id: string; why?: { reason: DeleteReason; note: string } }) => del(`/tips/entries/${id}`, why),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipEntries'] }),
  });
};

export const useDeletedEntriesReport = (startDate: string, endDate: string) =>
  useQuery({
    queryKey: ['deletedEntries', startDate, endDate],
    queryFn: () => get<DeletedEntriesReport>(`/tips/deleted-report?start_date=${startDate}&end_date=${endDate}`),
    enabled: !!startDate && !!endDate,
  });

export const usePublishTipEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<PublishResult>(`/tips/entries/${id}/publish`),
    onSuccess: (_data, id) => qc.invalidateQueries({ queryKey: ['tipEntries', id] }),
  });
};
