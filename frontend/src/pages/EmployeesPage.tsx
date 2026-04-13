import { useState } from 'react';
import {
  Box, Button, IconButton, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from '../api/employees';
import EmployeeDialog from '../components/EmployeeDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Employee } from '../types';

export default function EmployeesPage() {
  const { data: employees = [], isLoading } = useEmployees();
  const createMut = useCreateEmployee();
  const updateMut = useUpdateEmployee();
  const deleteMut = useDeleteEmployee();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleEdit(emp)}><EditIcon /></IconButton>
                  <IconButton size="small" onClick={() => setDeleteId(emp.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center">No employees yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <EmployeeDialog open={dialogOpen} employee={editing} onSubmit={handleSubmit} onClose={() => setDialogOpen(false)} />
      <ConfirmDialog open={!!deleteId} title="Delete Employee" message="This will deactivate the employee." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </Box>
  );
}
