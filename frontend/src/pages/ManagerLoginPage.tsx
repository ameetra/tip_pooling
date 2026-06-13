import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Link, Paper, TextField, Typography } from '@mui/material';
import { post } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import VenueBrand from '../components/VenueBrand';

export default function ManagerLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { slug } = useTenant();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { jwt, mustChangePassword } = await post<{ jwt: string; mustChangePassword: boolean }>('/auth/login', { email, password, slug });
      login(jwt);
      navigate(mustChangePassword ? `/${slug}/change-password` : `/${slug}`);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 420 }} elevation={2}>
        <VenueBrand />
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>Staff Sign In</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          For restaurant admins, managers, and shift leads. Sign in with your email and password.
        </Typography>

        <form onSubmit={handleSubmit}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField fullWidth label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus sx={{ mb: 2 }} />
          <TextField fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required sx={{ mb: 2 }} />
          <Button type="submit" variant="contained" fullWidth disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
          Employee?{' '}
          <Link component={RouterLink} to={`/${slug}/login`} underline="hover">Sign in here</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
