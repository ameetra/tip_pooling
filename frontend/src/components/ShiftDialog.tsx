import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import type { Shift } from '../types';

const schema = z.object({ name: z.string().min(1, 'Required').max(50) });
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  shift?: Shift | null;
  onSubmit: (data: FormData) => void;
  onClose: () => void;
}

export default function ShiftDialog({ open, shift, onSubmit, onClose }: Props) {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (open) reset(shift ? { name: shift.name } : { name: '' });
  }, [open, shift, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{shift ? 'Edit Shift' : 'Add Shift'}</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Controller name="name" control={control} render={({ field }) => (
            <TextField {...field} label="Shift Name" fullWidth error={!!errors.name} helperText={errors.name?.message} />
          )} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">{shift ? 'Save' : 'Create'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
