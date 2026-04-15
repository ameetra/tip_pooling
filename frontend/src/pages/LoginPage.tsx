import { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import api from '../api/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await api.post('/auth/magic-link', { email });
      setStatus('sent');
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }} elevation={2}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Sign in</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your work email to receive a magic link.
        </Typography>

        {status === 'sent' ? (
          <Alert severity="success">
            Magic link sent! Check CloudWatch logs (or your email once SES is configured).
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            {status === 'error' && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
            <TextField
              fullWidth
              label="Work email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 2 }}
              autoFocus
            />
            <Button type="submit" variant="contained" fullWidth disabled={status === 'loading'}>
              {status === 'loading' ? 'Sending…' : 'Send magic link'}
            </Button>
          </form>
        )}
      </Paper>
    </Box>
  );
}
