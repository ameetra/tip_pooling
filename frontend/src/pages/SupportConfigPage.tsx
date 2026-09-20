import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useSupportConfig, useSupportConfigHistory, useSetSupportConfig } from '../api/support-config';
import type { SupportStaffConfig } from '../types';

type Role = SupportStaffConfig['role'];

const ROLES: { role: Role; title: string }[] = [
  { role: 'BUSSER', title: 'Busser' },
  { role: 'EXPEDITOR', title: 'Expeditor' },
];

const localToday = () => new Date().toLocaleDateString('en-CA');
const day = (c: SupportStaffConfig) => c.effectiveDate.slice(0, 10);

// Each role is changed independently, with its own effective date.
function RoleCard({ role, title, current, scheduled }: { role: Role; title: string; current?: SupportStaffConfig; scheduled?: SupportStaffConfig }) {
  const setConfig = useSetSupportConfig();
  const [editing, setEditing] = useState(false);
  const [percentage, setPercentage] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(localToday());
  const [error, setError] = useState('');

  const startEdit = () => {
    setPercentage(current ? String(current.percentage) : '');
    setEffectiveDate(localToday());
    setError('');
    setEditing(true);
  };

  const save = async () => {
    try {
      await setConfig.mutateAsync([{ role, percentage: Number(percentage), effectiveDate }]);
      setEditing(false);
    } catch (e: any) { setError(e.message); }
  };

  return (
    <Card sx={{ minWidth: 280 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        {editing ? (
          <Stack spacing={2}>
            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
            <TextField label="Tip %" type="number" size="small" value={percentage} onChange={(e) => setPercentage(e.target.value)} slotProps={{ htmlInput: { min: 0, max: 50 } }} />
            <TextField
              label="Effective from" type="date" size="small" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)}
              helperText="Applies to tip entries dated on or after this day" slotProps={{ inputLabel: { shrink: true } }}
            />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={save} disabled={setConfig.isPending || !percentage || !effectiveDate}>Save</Button>
              <Button onClick={() => setEditing(false)}>Cancel</Button>
            </Stack>
          </Stack>
        ) : (
          <>
            <Typography variant="h4">{current ? `${current.percentage}%` : 'Not set'}</Typography>
            {current && <Typography variant="body2" color="text.secondary">since {day(current)}</Typography>}
            {scheduled && <Chip size="small" color="info" sx={{ mt: 1 }} label={`${scheduled.percentage}% from ${day(scheduled)}`} />}
            <Box sx={{ mt: 2 }}><Button variant="outlined" onClick={startEdit}>Change</Button></Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function SupportConfigPage() {
  const { data: current = [], isLoading } = useSupportConfig();
  const { data: history = [] } = useSupportConfigHistory();
  const today = localToday();

  const nextScheduled = (role: Role) =>
    history
      .filter((c) => c.role === role && day(c) > today)
      .sort((a, b) => day(a).localeCompare(day(b)) || b.createdAt.localeCompare(a.createdAt))[0];

  if (isLoading) return <Typography>Loading...</Typography>;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Support Staff Configuration</Typography>

      <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {ROLES.map(({ role, title }) => (
          <RoleCard key={role} role={role} title={title} current={current.find((c) => c.role === role)} scheduled={nextScheduled(role)} />
        ))}
      </Stack>

      {history.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>Change history</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>Role</TableCell><TableCell>Tip %</TableCell><TableCell>Effective from</TableCell><TableCell /></TableRow>
              </TableHead>
              <TableBody>
                {history.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{ROLES.find((r) => r.role === c.role)?.title}</TableCell>
                    <TableCell>{c.percentage}%</TableCell>
                    <TableCell>{day(c)}</TableCell>
                    <TableCell>{day(c) > today && <Chip size="small" color="info" label="Scheduled" />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
