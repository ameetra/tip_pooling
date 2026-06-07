import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography, Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyIcon from '@mui/icons-material/Key';
import AddIcon from '@mui/icons-material/Add';
import { usersApi, type Staff, type StaffRole } from '../api/users';
import { useAuth } from '../context/AuthContext';

const roleLabel = (r: StaffRole) => (r === 'MANAGER' ? 'Manager' : 'Shift Lead');

function AddStaffDialog({ open, onClose, callerRole }: { open: boolean; onClose: () => void; callerRole: string }) {
  const qc = useQueryClient();
  const canPickManager = callerRole === 'ADMIN';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>(canPickManager ? 'MANAGER' : 'SHIFT_LEAD');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => usersApi.create(email, password, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
      setEmail(''); setPassword(''); setError('');
      setRole(canPickManager ? 'MANAGER' : 'SHIFT_LEAD');
    },
    onError: (err: any) => setError(err.message || 'Failed to create staff member'),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add Staff</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as StaffRole)}
          disabled={!canPickManager}
          fullWidth
        >
          {canPickManager && <MenuItem value="MANAGER">Manager</MenuItem>}
          <MenuItem value="SHIFT_LEAD">Shift Lead</MenuItem>
        </TextField>
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

function ResetPasswordDialog({ staff, onClose }: { staff: Staff | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => usersApi.resetPassword(staff!.id, password),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); setPassword(''); setError(''); },
    onError: (err: any) => setError(err.message || 'Failed to reset password'),
  });

  return (
    <Dialog open={!!staff} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Reset Password — {staff?.email}</DialogTitle>
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
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<Staff | null>(null);

  const { data: staff = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const removeMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Staff</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Add Staff
        </Button>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Added</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!isLoading && staff.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary' }}>No staff yet</TableCell>
              </TableRow>
            )}
            {staff.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.email}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={roleLabel(s.role)}
                    color={s.role === 'MANAGER' ? 'primary' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Reset password">
                    <IconButton size="small" onClick={() => setResetTarget(s)}><KeyIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Remove">
                    <IconButton size="small" color="error" onClick={() => removeMutation.mutate(s.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <AddStaffDialog open={addOpen} onClose={() => setAddOpen(false)} callerRole={user?.role ?? ''} />
      <ResetPasswordDialog staff={resetTarget} onClose={() => setResetTarget(null)} />
    </Box>
  );
}
