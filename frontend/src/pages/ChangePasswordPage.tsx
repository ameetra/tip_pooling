import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Link, Paper, Typography } from '@mui/material';
import { post } from '../api/client';
import { useAuth, type AuthUser } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import PasswordField from '../components/PasswordField';
import { PASSWORD_RULES, passwordProblem, passwordSaveError } from '../utils/password';

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
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("The two passwords don't match.");
    setLoading(true);
    setError('');
    try {
      const { user } = await post<{ user: AuthUser }>('/auth/change-password', { newPassword: password });
      login(user);
      navigate(`/${slug}`);
    } catch (err: any) {
      setError(passwordSaveError(err));
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
          <PasswordField fullWidth label="New password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus autoComplete="new-password"
            error={!!password && !!passwordProblem(password)} helperText={(password && passwordProblem(password)) || PASSWORD_RULES} sx={{ mb: 2 }} />
          <PasswordField fullWidth label="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password"
            error={!!confirm && confirm !== password} helperText={confirm && confirm !== password ? "Doesn't match yet." : ' '} sx={{ mb: 2 }} />
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
