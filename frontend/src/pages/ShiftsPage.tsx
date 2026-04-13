import { useState } from 'react';
import {
  Box, Button, IconButton, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useShifts, useCreateShift, useUpdateShift, useDeleteShift } from '../api/shifts';
import ShiftDialog from '../components/ShiftDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Shift } from '../types';

export default function ShiftsPage() {
  const { data: shifts = [], isLoading } = useShifts();
  const createMut = useCreateShift();
  const updateMut = useUpdateShift();
  const deleteMut = useDeleteShift();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleCreate = () => { setEditing(null); setDialogOpen(true); };
  const handleEdit = (shift: Shift) => { setEditing(shift); setDialogOpen(true); };

  const handleSubmit = async (data: any) => {
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, data });
      else await createMut.mutateAsync(data);
      setDialogOpen(false);
      setError('');
    } catch (e: any) { setError(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMut.mutateAsync(deleteId);
    setDeleteId(null);
  };

  if (isLoading) return <Typography>Loading...</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Shifts</Typography>
        <Button variant="contained" onClick={handleCreate}>Add Shift</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.map((shift) => (
              <TableRow key={shift.id}>
                <TableCell>{shift.name}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleEdit(shift)}><EditIcon /></IconButton>
                  <IconButton size="small" onClick={() => setDeleteId(shift.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {shifts.length === 0 && (
              <TableRow><TableCell colSpan={2} align="center">No shifts yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ShiftDialog open={dialogOpen} shift={editing} onSubmit={handleSubmit} onClose={() => setDialogOpen(false)} />
      <ConfirmDialog open={!!deleteId} title="Delete Shift" message="This will deactivate the shift." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </Box>
  );
}
