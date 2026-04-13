import { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, TextField, Typography, Alert, Stack } from '@mui/material';
import { useSupportConfig, useSetSupportConfig } from '../api/support-config';

export default function SupportConfigPage() {
  const { data: configs = [], isLoading } = useSupportConfig();
  const setConfig = useSetSupportConfig();

  const [busser, setBusser] = useState('20');
  const [expeditor, setExpeditor] = useState('15');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (configs.length) {
      const b = configs.find((c) => c.role === 'BUSSER');
      const e = configs.find((c) => c.role === 'EXPEDITOR');
      if (b) setBusser(String(b.percentage));
      if (e) setExpeditor(String(e.percentage));
    }
  }, [configs]);

  const handleSave = async () => {
    try {
      await setConfig.mutateAsync([
        { role: 'BUSSER', percentage: Number(busser) },
        { role: 'EXPEDITOR', percentage: Number(expeditor) },
      ]);
      setEditing(false);
      setError('');
    } catch (e: any) { setError(e.message); }
  };

  if (isLoading) return <Typography>Loading...</Typography>;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Support Staff Configuration</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Stack direction="row" spacing={3}>
        <Card sx={{ minWidth: 250 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Busser</Typography>
            {editing ? (
              <TextField value={busser} onChange={(e) => setBusser(e.target.value)} type="number" label="Tip %" slotProps={{ htmlInput: { min: 0, max: 50 } }} size="small" />
            ) : (
              <Typography variant="h4">{busser}%</Typography>
            )}
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 250 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Expeditor</Typography>
            {editing ? (
              <TextField value={expeditor} onChange={(e) => setExpeditor(e.target.value)} type="number" label="Tip %" slotProps={{ htmlInput: { min: 0, max: 50 } }} size="small" />
            ) : (
              <Typography variant="h4">{expeditor}%</Typography>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Box sx={{ mt: 3 }}>
        {editing ? (
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={handleSave}>Save</Button>
            <Button onClick={() => setEditing(false)}>Cancel</Button>
          </Stack>
        ) : (
          <Button variant="outlined" onClick={() => setEditing(true)}>Edit Percentages</Button>
        )}
      </Box>
    </Box>
  );
}
