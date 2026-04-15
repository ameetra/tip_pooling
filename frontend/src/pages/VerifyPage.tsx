import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function VerifyPage() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setError('Missing token in URL.'); return; }

    api.get(`/auth/verify?token=${token}`)
      .then((data: any) => {
        login(data.jwt);
        navigate('/tips', { replace: true });
      })
      .catch((err: any) => setError(err.message || 'Verification failed. The link may have expired.'));
  }, []);

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <CircularProgress />
      <Typography color="text.secondary">Signing you in…</Typography>
    </Box>
  );
}
