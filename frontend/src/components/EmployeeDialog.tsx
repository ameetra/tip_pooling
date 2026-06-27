import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, MenuItem, Typography,
} from '@mui/material';
import type { Employee, EmployeeRole, RoleRateInput } from '../types';

const ROLES: { value: EmployeeRole; label: string }[] = [
  { value: 'SERVER', label: 'Server' },
  { value: 'BUSSER', label: 'Busser' },
  { value: 'EXPEDITOR', label: 'Expeditor' },
];

const optionalRate = z.number().positive('Must be positive').max(999).optional();

const schema = z.object({
  name: z.string().min(1, 'Required').max(100),
  email: z.string().email('Invalid email').max(255),
  role: z.enum(['SERVER', 'BUSSER', 'EXPEDITOR']),
  SERVER: optionalRate,
  BUSSER: optionalRate,
  EXPEDITOR: optionalRate,
}).refine((d) => d[d.role] != null, {
  message: 'Set a base rate for the primary role',
  path: ['SERVER'],
});

type FormData = z.infer<typeof schema>;

export interface EmployeeSubmit {
  name: string;
  email: string;
  role: EmployeeRole;
  rates: RoleRateInput[];
}

interface Props {
  open: boolean;
  employee?: Employee | null;
  onSubmit: (data: { name: string; email: string; role: EmployeeRole } | EmployeeSubmit) => void;
  onClose: () => void;
}

export default function EmployeeDialog({ open, employee, onSubmit, onClose }: Props) {
  const isEdit = !!employee;
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', role: 'SERVER', SERVER: 15 },
  });

  useEffect(() => {
    if (open) {
      reset(employee
        ? { name: employee.name, email: employee.email, role: employee.role }
        : { name: '', email: '', role: 'SERVER', SERVER: 15, BUSSER: undefined, EXPEDITOR: undefined });
    }
  }, [open, employee, reset]);

  const submit = (d: FormData) => {
    if (isEdit) {
      onSubmit({ name: d.name, email: d.email, role: d.role });
      return;
    }
    const rates = ROLES
      .filter((r) => d[r.value] != null)
      .map((r) => ({ role: r.value, hourlyRate: d[r.value] as number }));
    onSubmit({ name: d.name, email: d.email, role: d.role, rates });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(submit)}>
        <DialogTitle>{isEdit ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <Controller name="name" control={control} render={({ field }) => (
            <TextField {...field} label="Name" error={!!errors.name} helperText={errors.name?.message} />
          )} />
          <Controller name="email" control={control} render={({ field }) => (
            <TextField {...field} label="Email" error={!!errors.email} helperText={errors.email?.message} />
          )} />
          <Controller name="role" control={control} render={({ field }) => (
            <TextField {...field} select label="Primary Role" helperText="Used as the default when adding this person to a tip entry">
              {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>
          )} />
          {!isEdit && (
            <>
              <Typography variant="subtitle2" color="text.secondary">
                Base hourly rates — set one per role this person can work
              </Typography>
              {ROLES.map((r) => (
                <Controller key={r.value} name={r.value} control={control} render={({ field }) => (
                  <TextField
                    label={`${r.label} rate ($/hr)`} type="number"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    slotProps={{ htmlInput: { step: 0.5, min: 0 } }}
                    error={!!errors[r.value]} helperText={errors[r.value]?.message}
                  />
                )} />
              ))}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">{isEdit ? 'Save' : 'Create'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
