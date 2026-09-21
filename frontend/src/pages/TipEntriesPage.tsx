import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, IconButton, Link, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTipEntries, useOlderDrafts, useDeleteTipEntry, TIP_ENTRIES_LIMIT } from '../api/tips';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTenant } from '../context/TenantContext';
import { localDate } from '../utils/dates';

export default function TipEntriesPage() {
  const navigate = useNavigate();
  const { slug } = useTenant();
  // Default to the trailing 14 days: older entries have already been through payroll.
  const [since, setSince] = useState(() => localDate(13));
  const { data: entries = [], isFetching } = useTipEntries(since);
  const { data: olderDrafts = [] } = useOlderDrafts(since);
  const deleteMut = useDeleteTipEntry();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMut.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Tip Entries</Typography>
        <Button variant="contained" onClick={() => navigate(`/${slug}/tips/new`)}>New Tip Entry</Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Show entries from" type="date" size="small" value={since}
          onChange={(e) => setSince(e.target.value)} slotProps={{ inputLabel: { shrink: true } }}
        />
        <Typography variant="body2" color="text.secondary">
          Entries dated {since || '…'} or later, newest first. Change the date to look further back.
        </Typography>
      </Box>

      {olderDrafts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {olderDrafts.length} older {olderDrafts.length === 1 ? 'entry is' : 'entries are'} still not published:{' '}
          {olderDrafts.slice(0, 6).map((d, i) => (
            <span key={d.id}>
              {i > 0 && ', '}
              <Link component={RouterLink} to={`/${slug}/tips/${d.id}`}>{d.entryDate}</Link>
            </span>
          ))}
          {olderDrafts.length > 6 && ', …'}
        </Alert>
      )}

      {entries.length >= TIP_ENTRIES_LIMIT && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing the {TIP_ENTRIES_LIMIT} newest entries. Move the start date later to narrow the list.
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Cash in Register</TableCell>
              <TableCell>Cash Sales</TableCell>
              <TableCell>Cash Tips (jar)</TableCell>
              <TableCell>POS Tips</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/${slug}/tips/${entry.id}`)}>
                <TableCell>{entry.entryDate}</TableCell>
                <TableCell>${entry.cashInRegister.toFixed(2)}</TableCell>
                <TableCell>${entry.cashSales.toFixed(2)}</TableCell>
                <TableCell>${entry.cashTips.toFixed(2)}</TableCell>
                <TableCell>${entry.posTips.toFixed(2)}</TableCell>
                <TableCell>
                  {entry.publishedAt
                    ? <Chip label="Published" color="success" size="small" />
                    : <Chip label="Draft" size="small" />}
                </TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <IconButton size="small" onClick={() => navigate(`/${slug}/tips/${entry.id}`)}><VisibilityIcon /></IconButton>
                  <IconButton size="small" onClick={() => setDeleteId(entry.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {isFetching ? 'Loading...' : 'No tip entries in this date range.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog open={!!deleteId} title="Delete Tip Entry" message="This will soft-delete the entry." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </Box>
  );
}
