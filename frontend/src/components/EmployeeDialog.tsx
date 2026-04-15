import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, MenuItem,
} from '@mui/material';
import type { Employee } from '../types';

const createSchema = z.object({
  name: z.string().min(1, 'Required').max(100),
  email: z.string().email('Invalid email').max(255),
  role: z.enum(['SERVER', 'BUSSER', 'EXPEDITOR']),
  hourlyRate: z.number().positive('Must be positive').max(999),
});

type FormData = z.infer<typeof createSchema>;

interface Props {
  open: boolean;
  employee?: Employee | null;
  onSubmit: (data: FormData) => void;
  onClose: () => void;
}

export default function EmployeeDialog({ open, employee, onSubmit, onClose }: Props) {
  const isEdit = !!employee;
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', role: 'SERVER', hourlyRate: 15 },
  });

  useEffect(() => {
    if (open) {
      reset(employee
        ? { name: employee.name, email: employee.email, role: employee.role, hourlyRate: employee.hourlyRate }
        : { name: '', email: '', role: 'SERVER', hourlyRate: 15 });
    }
  }, [open, employee, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit((data) => onSubmit(data))}>
        <DialogTitle>{isEdit ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <Controller name="name" control={control} render={({ field }) => (
            <TextField {...field} label="Name" error={!!errors.name} helperText={errors.name?.message} />
          )} />
          <Controller name="email" control={control} render={({ field }) => (
            <TextField {...field} label="Email" error={!!errors.email} helperText={errors.email?.message} />
          )} />
          <Controller name="role" control={control} render={({ field }) => (
            <TextField {...field} select label="Role">
              <MenuItem value="SERVER">Server</MenuItem>
              <MenuItem value="BUSSER">Busser</MenuItem>
              <MenuItem value="EXPEDITOR">Expeditor</MenuItem>
            </TextField>
          )} />
          {!isEdit && (
            <Controller name="hourlyRate" control={control} render={({ field }) => (
              <TextField {...field} onChange={(e) => field.onChange(Number(e.target.value))} label="Hourly Rate ($)" type="number" slotProps={{ htmlInput: { step: 0.5, min: 0 } }} error={!!errors.hourlyRate} helperText={errors.hourlyRate?.message} />
            )} />
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
