import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, IconButton, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTipEntries, useDeleteTipEntry } from '../api/tips';
import ConfirmDialog from '../components/ConfirmDialog';

export default function TipEntriesPage() {
  const navigate = useNavigate();
  const { data: entries = [], isLoading } = useTipEntries();
  const deleteMut = useDeleteTipEntry();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMut.mutateAsync(deleteId);
    setDeleteId(null);
  };

  if (isLoading) return <Typography>Loading...</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Tip Entries</Typography>
        <Button variant="contained" onClick={() => navigate('/tips/new')}>New Tip Entry</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Starting Drawer</TableCell>
              <TableCell>Closing Drawer</TableCell>
              <TableCell>Cash Sales</TableCell>
              <TableCell>Electronic Tips</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/tips/${entry.id}`)}>
                <TableCell>{entry.entryDate}</TableCell>
                <TableCell>${entry.startingDrawer.toFixed(2)}</TableCell>
                <TableCell>${entry.closingDrawer.toFixed(2)}</TableCell>
                <TableCell>${entry.cashSales.toFixed(2)}</TableCell>
                <TableCell>${entry.electronicTips.toFixed(2)}</TableCell>
                <TableCell>
                  {entry.publishedAt
                    ? <Chip label="Published" color="success" size="small" />
                    : <Chip label="Draft" size="small" />}
                </TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <IconButton size="small" onClick={() => navigate(`/tips/${entry.id}`)}><VisibilityIcon /></IconButton>
                  <IconButton size="small" onClick={() => setDeleteId(entry.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center">No tip entries yet. Create your first one!</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog open={!!deleteId} title="Delete Tip Entry" message="This will soft-delete the entry." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </Box>
  );
}
