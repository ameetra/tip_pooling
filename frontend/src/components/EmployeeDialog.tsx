import { useEffect } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, MenuItem, Typography,
} from '@mui/material';
import type { Employee, EmployeeRole, RoleRateInput } from '../types';
import { ROLE_OPTIONS, ROLE_VALUES } from '../constants/roles';

const optionalRate = z.number().positive('Must be positive').max(999).optional();
const rateFields = { SERVER: optionalRate, SHIFT_LEAD: optionalRate, BUSSER: optionalRate, EXPEDITOR: optionalRate };
const role = z.enum(ROLE_VALUES, { message: 'Choose a role' });
const identity = {
  name: z.string().min(1, 'Required').max(100),
  email: z.string().email('Invalid email').max(255),
};

// The primary role needs a base rate; the message appears under that role's own rate field.
const requirePrimaryRate = (d: { role: EmployeeRole } & Partial<Record<EmployeeRole, number>>, ctx: z.RefinementCtx) => {
  if (d[d.role] == null) ctx.addIssue({ code: 'custom', message: 'Set a base rate for the primary role', path: [d.role] });
};

// Each mode validates only the fields it shows (Edit has no rates; Reactivate has no name or email).
const schemas = {
  create: z.object({ ...identity, role, ...rateFields }).superRefine(requirePrimaryRate),
  edit: z.object({ ...identity, role }),
  reactivate: z.object({ role, ...rateFields }).superRefine(requirePrimaryRate),
};

type FormValues = { name?: string; email?: string; role?: EmployeeRole } & Partial<Record<EmployeeRole, number>>;

export type EmployeeDialogMode = 'create' | 'edit' | 'reactivate';

export interface EmployeeSubmit {
  name: string;
  email: string;
  role: EmployeeRole;
  rates: RoleRateInput[];
}

export interface ReactivateSubmit {
  role: EmployeeRole;
  rates: RoleRateInput[];
}

interface Props {
  open: boolean;
  employee?: Employee | null;
  mode?: EmployeeDialogMode;
  pending?: boolean;
  onSubmit: (data: { name: string; email: string; role: EmployeeRole } | EmployeeSubmit | ReactivateSubmit) => void;
  onClose: () => void;
}

const TITLES = { create: 'Add Employee', edit: 'Edit Employee', reactivate: 'Reactivate' } as const;
const SUBMIT_LABELS = { create: 'Create', edit: 'Save', reactivate: 'Reactivate' } as const;

// Reactivation starts completely blank: nothing from the previous stint is carried over, so an old role or wage
// can't slip through by default.
const startingValues = (mode: EmployeeDialogMode, employee?: Employee | null): FormValues => {
  if (mode === 'edit' && employee) return { name: employee.name, email: employee.email, role: employee.role };
  if (mode === 'reactivate') return {};
  return { name: '', email: '', role: 'SERVER', SERVER: 15 };
};

export default function EmployeeDialog({ open, employee, mode: modeProp, pending, onSubmit, onClose }: Props) {
  const mode: EmployeeDialogMode = modeProp ?? (employee ? 'edit' : 'create');
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schemas[mode]) as unknown as Resolver<FormValues>,
    defaultValues: startingValues(mode, employee),
  });

  useEffect(() => {
    if (open) reset(startingValues(mode, employee));
  }, [open, mode, employee, reset]);

  const submit = (d: FormValues) => {
    const rates = ROLE_OPTIONS
      .filter((r) => d[r.value] != null)
      .map((r) => ({ role: r.value, hourlyRate: d[r.value] as number }));
    if (mode === 'edit') onSubmit({ name: d.name!, email: d.email!, role: d.role! });
    else if (mode === 'reactivate') onSubmit({ role: d.role!, rates });
    else onSubmit({ name: d.name!, email: d.email!, role: d.role!, rates });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(submit)}>
        <DialogTitle>{mode === 'reactivate' ? `${TITLES.reactivate} ${employee?.name ?? ''}` : TITLES[mode]}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          {mode === 'reactivate' && (
            <Typography variant="body2" color="text.secondary">
              Their previous role and rates are not carried over. Enter the role and hourly rates that apply now.
            </Typography>
          )}
          {mode !== 'reactivate' && (
            <>
              <Controller name="name" control={control} render={({ field }) => (
                <TextField {...field} value={field.value ?? ''} label="Name" error={!!errors.name} helperText={errors.name?.message} />
              )} />
              <Controller name="email" control={control} render={({ field }) => (
                <TextField {...field} value={field.value ?? ''} label="Email" error={!!errors.email} helperText={errors.email?.message} />
              )} />
            </>
          )}
          <Controller name="role" control={control} render={({ field }) => (
            <TextField
              {...field} value={field.value ?? ''} select label="Primary Role"
              error={!!errors.role} helperText={errors.role?.message ?? 'Used as the default when adding this person to a tip entry'}
            >
              {ROLE_OPTIONS.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>
          )} />
          {mode !== 'edit' && (
            <>
              <Typography variant="subtitle2" color="text.secondary">
                Base hourly rates — set one per role this person can work
              </Typography>
              {ROLE_OPTIONS.map((r) => (
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
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? 'Saving...' : SUBMIT_LABELS[mode]}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
