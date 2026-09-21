import { useState } from 'react';
import {
  Box, Button, IconButton, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import RestoreIcon from '@mui/icons-material/Restore';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useSetRoleRates, useDeleteEmployee, useReactivateEmployee, type EmployeeStatus } from '../api/employees';
import EmployeeDialog from '../components/EmployeeDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Employee, EmployeeRole, RoleRateInput } from '../types';
import { ROLE_OPTIONS, ROLE_VALUES, formatRole } from '../constants/roles';
import { localDate } from '../utils/dates';

const today = localDate();
const emptyRates = () => Object.fromEntries(ROLE_VALUES.map((r) => [r, ''])) as Record<EmployeeRole, string>;

const rateFor = (emp: Employee, role: EmployeeRole) =>
  emp.roleRates?.find((r) => r.role === role)?.hourlyRate;

const ratesLabel = (emp: Employee) =>
  (emp.roleRates ?? []).map((r) => `${formatRole(r.role)} $${r.hourlyRate.toFixed(2)}`).join(', ') || '—';

export default function EmployeesPage() {
  const [status, setStatus] = useState<EmployeeStatus>('active');
  const { data: employees = [], isFetching } = useEmployees(status);
  const createMut = useCreateEmployee();
  const updateMut = useUpdateEmployee();
  const setRatesMut = useSetRoleRates();
  const deleteMut = useDeleteEmployee();
  const reactivateMut = useReactivateEmployee();

  const [reactivating, setReactivating] = useState<Employee | null>(null);
  const [notice, setNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [rateEmployee, setRateEmployee] = useState<Employee | null>(null);
  const [rateInputs, setRateInputs] = useState<Record<EmployeeRole, string>>(emptyRates);
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

  const handleReactivate = async (data: { role: EmployeeRole; rates: RoleRateInput[] }) => {
    if (!reactivating) return;
    try {
      await reactivateMut.mutateAsync({ id: reactivating.id, data: { ...data, effectiveDate: localDate() } });
      setNotice(`${reactivating.name} is active again.`);
      setReactivating(null);
      setStatus('active');
      setError('');
    } catch (e: any) { setError(e.message); }
  };

  const openRateDialog = (emp: Employee) => {
    setRateEmployee(emp);
    setRateInputs(Object.fromEntries(
      ROLE_VALUES.map((r) => [r, rateFor(emp, r)?.toString() ?? '']),
    ) as Record<EmployeeRole, string>);
    setRateEffectiveDate(today);
  };

  const handleRateSubmit = async () => {
    if (!rateEmployee) return;
    const rates = ROLE_OPTIONS
      .filter((r) => rateInputs[r.value] !== '' && Number(rateInputs[r.value]) > 0)
      .map((r) => ({ role: r.value, hourlyRate: Number(rateInputs[r.value]) }));
    if (rates.length === 0) { setError('Set at least one rate'); return; }
    try {
      await setRatesMut.mutateAsync({ id: rateEmployee.id, data: { rates, effectiveDate: rateEffectiveDate } });
      setRateEmployee(null);
      setError('');
    } catch (e: any) { setError(e.message); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Employees</Typography>
        <Button variant="contained" onClick={handleCreate}>Add Employee</Button>
      </Box>

      <ToggleButtonGroup
        exclusive size="small" value={status} sx={{ mb: 2 }}
        onChange={(_, next: EmployeeStatus | null) => { if (next) { setStatus(next); setNotice(''); } }}
      >
        <ToggleButton value="active">Active</ToggleButton>
        <ToggleButton value="inactive">Inactive</ToggleButton>
      </ToggleButtonGroup>

      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>{status === 'active' ? 'Primary Role' : 'Last Role'}</TableCell>
              {status === 'active' ? <TableCell>Base Rates (per role)</TableCell> : <TableCell>Deactivated</TableCell>}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell>{emp.name}</TableCell>
                <TableCell>{emp.email}</TableCell>
                <TableCell>{formatRole(emp.role)}</TableCell>
                {status === 'active' ? <TableCell>{ratesLabel(emp)}</TableCell> : <TableCell>{new Date(emp.updatedAt).toLocaleDateString()}</TableCell>}
                <TableCell align="right">
                  {status === 'active' ? (
                    <>
                      <IconButton size="small" onClick={() => openRateDialog(emp)} title="Edit Rates"><AttachMoneyIcon /></IconButton>
                      <IconButton size="small" onClick={() => handleEdit(emp)} title="Edit"><EditIcon /></IconButton>
                      <IconButton size="small" onClick={() => setDeleteId(emp.id)} title="Delete"><DeleteIcon /></IconButton>
                    </>
                  ) : (
                    <Button size="small" startIcon={<RestoreIcon />} onClick={() => setReactivating(emp)}>Reactivate</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  {isFetching ? 'Loading...' : status === 'active' ? 'No employees yet' : 'No inactive employees'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <EmployeeDialog open={dialogOpen} employee={editing} onSubmit={handleSubmit} onClose={() => setDialogOpen(false)} />
      <ConfirmDialog open={!!deleteId} title="Delete Employee" message="This will deactivate the employee. You can bring them back later from the Inactive list." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />

      <EmployeeDialog
        open={!!reactivating} employee={reactivating} mode="reactivate" pending={reactivateMut.isPending}
        onSubmit={(data) => handleReactivate(data as { role: EmployeeRole; rates: RoleRateInput[] })} onClose={() => setReactivating(null)}
      />

      {/* Edit Rates Dialog — one base rate per role this person can work */}
      <Dialog open={!!rateEmployee} onClose={() => setRateEmployee(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Base Rates — {rateEmployee?.name}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <Typography variant="body2" color="text.secondary">
            Set the hourly rate for each role. Leave a field blank if they don't work that role.
          </Typography>
          {ROLE_OPTIONS.map((r) => (
            <TextField
              key={r.value} label={`${r.label} rate ($/hr)`} type="number"
              value={rateInputs[r.value]}
              onChange={(e) => setRateInputs({ ...rateInputs, [r.value]: e.target.value })}
              slotProps={{ htmlInput: { step: 0.5, min: 0 } }}
            />
          ))}
          <TextField label="Effective Date" type="date" value={rateEffectiveDate} onChange={(e) => setRateEffectiveDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRateEmployee(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleRateSubmit} disabled={setRatesMut.isPending}>
            {setRatesMut.isPending ? 'Saving...' : 'Save Rates'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
