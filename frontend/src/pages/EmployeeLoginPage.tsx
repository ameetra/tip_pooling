import { useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Link, Paper, TextField, Typography } from '@mui/material';
import { post } from '../api/client';

export default function EmployeeLoginPage() {
  const [params] = useSearchParams();
  const prefillEmail = params.get('email') ?? '';

  const [email, setEmail] = useState(prefillEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await post('/auth/magic-link', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Could not send sign-in link. Check your email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 420 }} elevation={2}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>Welcome</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to view your tip history. We'll send a one-time link to your work email.
        </Typography>

        {sent ? (
          <Alert severity="success">
            Check your email — a sign-in link has been sent to <strong>{email}</strong>. It expires in 15 minutes.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField
              fullWidth
              label="Work email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              sx={{ mb: 2 }}
            />
            <Button type="submit" variant="contained" fullWidth disabled={loading || !email}>
              {loading ? 'Sending…' : 'Send sign-in link'}
            </Button>
          </form>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
          Restaurant manager?{' '}
          <Link component={RouterLink} to="/manager-login" underline="hover">Sign in here</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
