import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography, Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyIcon from '@mui/icons-material/Key';
import AddIcon from '@mui/icons-material/Add';
import { usersApi, type Manager } from '../api/users';

function AddManagerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => usersApi.create(email, password),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); setEmail(''); setPassword(''); setError(''); },
    onError: (err: any) => setError(err.message || 'Failed to create manager'),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add Manager</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
        <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth helperText="Min 8 characters" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => mutation.mutate()} disabled={!email || password.length < 8 || mutation.isPending}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ResetPasswordDialog({ manager, onClose }: { manager: Manager | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => usersApi.resetPassword(manager!.id, password),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); setPassword(''); setError(''); },
    onError: (err: any) => setError(err.message || 'Failed to reset password'),
  });

  return (
    <Dialog open={!!manager} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Reset Password — {manager?.email}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="New Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth helperText="Min 8 characters" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => mutation.mutate()} disabled={password.length < 8 || mutation.isPending}>
          Reset
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<Manager | null>(null);

  const { data: managers = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const removeMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Managers</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Add Manager
        </Button>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Added</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!isLoading && managers.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary' }}>No managers yet</TableCell>
              </TableRow>
            )}
            {managers.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.email}</TableCell>
                <TableCell>{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Reset password">
                    <IconButton size="small" onClick={() => setResetTarget(m)}><KeyIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Remove manager">
                    <IconButton size="small" color="error" onClick={() => removeMutation.mutate(m.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <AddManagerDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <ResetPasswordDialog manager={resetTarget} onClose={() => setResetTarget(null)} />
    </Box>
  );
}
