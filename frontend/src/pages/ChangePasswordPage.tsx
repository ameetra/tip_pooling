import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Link, Paper, TextField, Typography } from '@mui/material';
import { post } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const { slug } = useTenant();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    setError('');
    try {
      const { jwt } = await post<{ jwt: string }>('/auth/change-password', { newPassword: password });
      login(jwt);
      navigate(`/${slug}`);
    } catch (err: any) {
      setError(err.message || 'Could not change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 420 }} elevation={2}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>Set a New Password</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          For your security, you must choose a new password before continuing.
        </Typography>

        <form onSubmit={handleSubmit}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField fullWidth label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus sx={{ mb: 2 }} />
          <TextField fullWidth label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required sx={{ mb: 2 }} />
          <Button type="submit" variant="contained" fullWidth disabled={loading}>
            {loading ? 'Saving…' : 'Set password'}
          </Button>
        </form>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
          <Link component="button" type="button" onClick={() => { logout(); navigate(`/${slug}/manager-login`); }} underline="hover">Sign out</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
