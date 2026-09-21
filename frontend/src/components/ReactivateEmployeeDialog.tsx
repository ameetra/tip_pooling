import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';
import type { Employee, EmployeeRole, ReactivateEmployeeInput } from '../types';
import { ROLE_OPTIONS, ROLE_VALUES, formatRole } from '../constants/roles';
import { localDate } from '../utils/dates';

const emptyRates = () => Object.fromEntries(ROLE_VALUES.map((r) => [r, ''])) as Record<EmployeeRole, string>;

interface Props {
  open: boolean;
  employee: Employee | null;
  pending?: boolean;
  onSubmit: (data: ReactivateEmployeeInput) => void;
  onClose: () => void;
}

export default function ReactivateEmployeeDialog({ open, employee, pending, onSubmit, onClose }: Props) {
  const [role, setRole] = useState<EmployeeRole | ''>('');
  const [rates, setRates] = useState(emptyRates);
  const [effectiveDate, setEffectiveDate] = useState(localDate());
  const [error, setError] = useState('');

  // Always start blank: nothing from the previous stint is carried over, so an old role or wage can't slip through.
  useEffect(() => {
    if (open) {
      setRole('');
      setRates(emptyRates());
      setEffectiveDate(localDate());
      setError('');
    }
  }, [open, employee?.id]);

  const submit = () => {
    if (!role) { setError('Choose their role.'); return; }
    const entered = ROLE_OPTIONS
      .filter((r) => rates[r.value] !== '')
      .map((r) => ({ role: r.value, hourlyRate: Number(rates[r.value]) }));
    if (entered.some((r) => !(r.hourlyRate > 0))) { setError('Every rate must be greater than zero.'); return; }
    if (!entered.some((r) => r.role === role)) { setError(`Enter the hourly rate for ${formatRole(role)}.`); return; }
    if (!effectiveDate) { setError('Choose the date these rates start.'); return; }
    onSubmit({ role, rates: entered, effectiveDate });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Reactivate {employee?.name}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        <Typography variant="body2" color="text.secondary">
          Their previous role and rates are not carried over. Enter the role and hourly rates that apply now.
        </Typography>
        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        <TextField select required label="Role" value={role} onChange={(e) => setRole(e.target.value as EmployeeRole)} helperText="Used as the default when adding this person to a tip entry">
          {ROLE_OPTIONS.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
        </TextField>
        <Typography variant="subtitle2" color="text.secondary">
          Hourly rate for each role they will work (leave blank for the others)
        </Typography>
        {ROLE_OPTIONS.map((r) => (
          <TextField
            key={r.value} label={`${r.label} rate ($/hr)`} type="number" value={rates[r.value]}
            onChange={(e) => setRates({ ...rates, [r.value]: e.target.value })}
            slotProps={{ htmlInput: { step: 0.5, min: 0 } }}
          />
        ))}
        <TextField
          label="Rates start on" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={pending}>{pending ? 'Reactivating...' : 'Reactivate'}</Button>
      </DialogActions>
    </Dialog>
  );
}
