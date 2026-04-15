import { useState } from 'react';
import {
  Box, Button, IconButton, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useUpdateRate, useDeleteEmployee } from '../api/employees';
import EmployeeDialog from '../components/EmployeeDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Employee } from '../types';

const today = new Date().toISOString().slice(0, 10);

export default function EmployeesPage() {
  const { data: employees = [], isLoading } = useEmployees();
  const createMut = useCreateEmployee();
  const updateMut = useUpdateEmployee();
  const updateRateMut = useUpdateRate();
  const deleteMut = useDeleteEmployee();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [rateEmployee, setRateEmployee] = useState<Employee | null>(null);
  const [newRate, setNewRate] = useState('');
  const [rateEffectiveDate, setRateEffectiveDate] = useState(today);
  const [error, setError] = useState('');

  const handleCreate = () => { setEditing(null); setDialogOpen(true); };
  const handleEdit = (emp: Employee) => { setEditing(emp); setDialogOpen(true); };

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

  const openRateDialog = (emp: Employee) => {
    setRateEmployee(emp);
    setNewRate(String(emp.hourlyRate));
    setRateEffectiveDate(today);
  };

  const handleRateSubmit = async () => {
    if (!rateEmployee) return;
    try {
      await updateRateMut.mutateAsync({
        id: rateEmployee.id,
        data: { hourlyRate: Number(newRate), effectiveDate: rateEffectiveDate },
      });
      setRateEmployee(null);
      setError('');
    } catch (e: any) { setError(e.message); }
  };

  if (isLoading) return <Typography>Loading...</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Employees</Typography>
        <Button variant="contained" onClick={handleCreate}>Add Employee</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Hourly Rate</TableCell>
              <TableCell>Rate Since</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell>{emp.name}</TableCell>
                <TableCell>{emp.email}</TableCell>
                <TableCell>{emp.role}</TableCell>
                <TableCell>${emp.hourlyRate.toFixed(2)}</TableCell>
                <TableCell>{emp.rateHistory?.[0]?.effectiveDate || '—'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openRateDialog(emp)} title="Update Rate"><AttachMoneyIcon /></IconButton>
                  <IconButton size="small" onClick={() => handleEdit(emp)} title="Edit"><EditIcon /></IconButton>
                  <IconButton size="small" onClick={() => setDeleteId(emp.id)} title="Delete"><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">No employees yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <EmployeeDialog open={dialogOpen} employee={editing} onSubmit={handleSubmit} onClose={() => setDialogOpen(false)} />
      <ConfirmDialog open={!!deleteId} title="Delete Employee" message="This will deactivate the employee." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />

      {/* Update Rate Dialog */}
      <Dialog open={!!rateEmployee} onClose={() => setRateEmployee(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Update Rate — {rateEmployee?.name}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <Typography variant="body2" color="text.secondary">
            Current rate: ${rateEmployee?.hourlyRate.toFixed(2)}/hr
          </Typography>
          <TextField label="New Hourly Rate ($)" type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} slotProps={{ htmlInput: { step: 0.5, min: 0 } }} />
          <TextField label="Effective Date" type="date" value={rateEffectiveDate} onChange={(e) => setRateEffectiveDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRateEmployee(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleRateSubmit} disabled={updateRateMut.isPending || !newRate || Number(newRate) <= 0}>
            {updateRateMut.isPending ? 'Saving...' : 'Update Rate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
