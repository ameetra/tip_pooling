import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Chip, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import { useTipEntry, useDeleteTipEntry, usePublishTipEntry } from '../api/tips';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTenant } from '../context/TenantContext';
import { formatRole } from '../constants/roles';

export default function TipEntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { slug } = useTenant();
  const { data: entry, isLoading } = useTipEntry(id!);
  const deleteMut = useDeleteTipEntry();
  const publishMut = usePublishTipEntry();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [publishResult, setPublishResult] = useState<{ emailsSent: number; emailsFailed: number } | null>(null);

  const handleDelete = async () => {
    await deleteMut.mutateAsync(id!);
    navigate(`/${slug}/tips`);
  };

  const handlePublish = async () => {
    const result = await publishMut.mutateAsync(id!);
    setPublishResult(result);
    setConfirmPublish(false);
  };

  if (isLoading) return <Typography>Loading...</Typography>;
  if (!entry) return <Typography>Entry not found</Typography>;

  const drawerOverage = entry.cashInRegister - entry.cashSales;
  const cashTipsTotal = drawerOverage + entry.cashTips;
  const totalPool = cashTipsTotal + entry.posTips;
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  // Aggregate per employee — one row per person (they may have multiple role stints).
  const byEmployee = new Map<string, { name: string; roles: string[]; hours: number; tips: number; totalPay: number }>();
  for (const c of entry.tipCalculations) {
    const r = byEmployee.get(c.employeeId) ?? { name: c.employee.name, roles: [], hours: 0, tips: 0, totalPay: 0 };
    if (!r.roles.includes(c.roleOnDay)) r.roles.push(c.roleOnDay);
    r.hours += c.totalHours;
    r.tips += c.finalTips;
    r.totalPay += c.totalPay;
    byEmployee.set(c.employeeId, r);
  }
  const rows = [...byEmployee.entries()].map(([id, r]) => ({ id, ...r, rate: r.hours > 0 ? r.totalPay / r.hours : 0 }));

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/${slug}/tips`)} sx={{ mb: 2 }}>Back to Entries</Button>

      {publishResult && (
        <Alert severity={publishResult.emailsFailed > 0 ? 'warning' : 'success'} sx={{ mb: 2 }} onClose={() => setPublishResult(null)}>
          Published! {publishResult.emailsSent} email(s) sent
          {publishResult.emailsFailed > 0 && `, ${publishResult.emailsFailed} failed`}.
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h5">Tip Entry: {entry.entryDate}</Typography>
            {entry.publishedAt
              ? <Chip label={`Published ${new Date(entry.publishedAt).toLocaleDateString()}`} color="success" />
              : <Chip label="Draft" />}
          </Box>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }} useFlexGap>
            <Chip label={`Cash in Register: ${fmt(entry.cashInRegister)}`} />
            <Chip label={`Cash Sales: ${fmt(entry.cashSales)}`} />
            <Chip label={`Cash Tips (jar): ${fmt(entry.cashTips)}`} />
            <Chip label={`POS Tips: ${fmt(entry.posTips)}`} />
            <Chip label={`Cash Tips Total: ${fmt(cashTipsTotal)}`} color="info" />
            <Chip label={`Total Pool: ${fmt(totalPool)}`} color="primary" />
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>Calculation Breakdown</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell><TableCell>Role(s)</TableCell>
              <TableCell>Hours</TableCell><TableCell>Tips</TableCell>
              <TableCell>Total Pay</TableCell><TableCell>$/hr</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.roles.map(formatRole).join(', ')}</TableCell>
                <TableCell>{Number(r.hours.toFixed(2))}</TableCell>
                <TableCell><strong>{fmt(r.tips)}</strong></TableCell>
                <TableCell>{fmt(r.totalPay)}</TableCell>
                <TableCell>{fmt(r.rate)}/hr</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction="row" spacing={2}>
        {!entry.publishedAt && (
          <Button variant="contained" color="success" startIcon={<SendIcon />} onClick={() => setConfirmPublish(true)}>
            Publish & Send Emails
          </Button>
        )}
        <Button color="error" variant="outlined" onClick={() => setConfirmDelete(true)}>Delete Entry</Button>
      </Stack>

      <ConfirmDialog
        open={confirmPublish}
        title="Publish & Send Emails"
        message={`This will send tip summary emails to all ${rows.length} employee(s) for ${entry.entryDate}. This cannot be undone.`}
        onConfirm={handlePublish}
        onCancel={() => setConfirmPublish(false)}
        confirmLabel="Publish & Send"
        confirmColor="success"
      />
      <ConfirmDialog open={confirmDelete} title="Delete Tip Entry" message="This will soft-delete the entry." onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} />
    </Box>
  );
}
