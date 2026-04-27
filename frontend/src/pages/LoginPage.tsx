import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Divider, Paper, TextField, Typography } from '@mui/material';
import { post } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  const [empEmail, setEmpEmail] = useState('');
  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState('');
  const [empSent, setEmpSent] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError('');
    try {
      const { jwt } = await post<{ jwt: string }>('/auth/login', { email, password });
      login(jwt);
      navigate('/');
    } catch (err: any) {
      setAdminError(err.message || 'Invalid email or password.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpLoading(true);
    setEmpError('');
    try {
      await post('/auth/magic-link', { email: empEmail });
      setEmpSent(true);
    } catch (err: any) {
      setEmpError(err.message || 'Could not send magic link. Check your email address.');
    } finally {
      setEmpLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }} elevation={2}>

        {/* Admin / Manager */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Admin / Manager</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Sign in with your email and password.</Typography>
        <form onSubmit={handleAdminLogin}>
          {adminError && <Alert severity="error" sx={{ mb: 2 }}>{adminError}</Alert>}
          <TextField fullWidth label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required sx={{ mb: 2 }} autoFocus />
          <TextField fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required sx={{ mb: 2 }} />
          <Button type="submit" variant="contained" fullWidth disabled={adminLoading}>
            {adminLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <Divider sx={{ my: 3 }} />

        {/* Employee */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Employee</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Enter your work email to receive a sign-in link.</Typography>

        {empSent ? (
          <Alert severity="success">
            Check your email — a sign-in link has been sent to <strong>{empEmail}</strong>. It expires in 15 minutes.
          </Alert>
        ) : (
          <form onSubmit={handleMagicLink}>
            {empError && <Alert severity="error" sx={{ mb: 2 }}>{empError}</Alert>}
            <TextField fullWidth label="Work email" type="email" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} required sx={{ mb: 2 }} />
            <Button type="submit" variant="outlined" fullWidth disabled={empLoading}>
              {empLoading ? 'Sending…' : 'Send sign-in link'}
            </Button>
          </form>
        )}

      </Paper>
    </Box>
  );
}
