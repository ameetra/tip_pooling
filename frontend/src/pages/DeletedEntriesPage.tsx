import { useState } from 'react';
import {
  Alert, Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useDeletedEntriesReport } from '../api/tips';
import type { DeleteReason } from '../types';
import { money } from '../utils/cash';
import { localDate } from '../utils/dates';
import { DELETE_REASON_LABELS } from '../utils/tipEntry';

const reasonLabel = (r: string | null) => (r ? DELETE_REASON_LABELS[r as DeleteReason] : '—');

// Admin-only: published entries that were deleted, by whom and why, so repeat mistakes can be coached (PRD 3.11).
export default function DeletedEntriesPage() {
  const [startDate, setStartDate] = useState(() => localDate(29));
  const [endDate, setEndDate] = useState(() => localDate());
  const { data, isFetching, error } = useDeletedEntriesReport(startDate, endDate);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Deleted Entries</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Published tip entries that were deleted, who deleted them and why.
      </Typography>

      <Stack direction="row" spacing={2} useFlexGap sx={{ mb: 2, flexWrap: 'wrap' }}>
        <TextField label="Deleted from" type="date" size="small" value={startDate} onChange={(e) => setStartDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="Deleted to" type="date" size="small" value={endDate} onChange={(e) => setEndDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}

      {data && data.byUser.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 2, flexWrap: 'wrap' }}>
          {data.byUser.map((u) => (
            <Paper key={u.email} variant="outlined" sx={{ px: 1.5, py: 1 }}>
              <Typography variant="subtitle2">{u.email}: {u.count} {u.count === 1 ? 'deletion' : 'deletions'}</Typography>
              <Typography variant="caption" color="text.secondary">
                {Object.entries(u.reasons).map(([r, n]) => `${reasonLabel(r)} ${n}`).join(' · ')}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Entry date</TableCell><TableCell>Deleted</TableCell><TableCell>Deleted by</TableCell>
              <TableCell>Reason</TableCell><TableCell>Note</TableCell><TableCell align="right">Total tips</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{e.entryDate}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(e.deletedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                <TableCell>{e.deletedByEmail ?? '—'}</TableCell>
                <TableCell><Chip size="small" label={reasonLabel(e.deleteReason)} /></TableCell>
                <TableCell sx={{ minWidth: 200 }}>{e.deleteNote ?? '—'}</TableCell>
                <TableCell align="right">{money(e.totalTipPool)}</TableCell>
              </TableRow>
            ))}
            {data?.entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">{isFetching ? 'Loading...' : 'No published entries were deleted in this date range.'}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
