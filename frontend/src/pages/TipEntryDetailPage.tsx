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

export default function TipEntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useTipEntry(id!);
  const deleteMut = useDeleteTipEntry();
  const publishMut = usePublishTipEntry();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [publishResult, setPublishResult] = useState<{ emailsSent: number; emailsFailed: number } | null>(null);

  const handleDelete = async () => {
    await deleteMut.mutateAsync(id!);
    navigate('/tips');
  };

  const handlePublish = async () => {
    const result = await publishMut.mutateAsync(id!);
    setPublishResult(result);
    setConfirmPublish(false);
  };

  if (isLoading) return <Typography>Loading...</Typography>;
  if (!entry) return <Typography>Entry not found</Typography>;

  const cashTips = entry.closingDrawer - entry.startingDrawer - entry.cashSales;
  const totalPool = cashTips + entry.electronicTips;
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/tips')} sx={{ mb: 2 }}>Back to Entries</Button>

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
            <Chip label={`Starting: ${fmt(entry.startingDrawer)}`} />
            <Chip label={`Closing: ${fmt(entry.closingDrawer)}`} />
            <Chip label={`Cash Sales: ${fmt(entry.cashSales)}`} />
            <Chip label={`Cash Tips: ${fmt(cashTips)}`} color="info" />
            <Chip label={`Electronic: ${fmt(entry.electronicTips)}`} />
            <Chip label={`Total Pool: ${fmt(totalPool)}`} color="primary" />
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>Calculation Breakdown</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell><TableCell>Role</TableCell><TableCell>Shifts</TableCell>
              <TableCell>Hours</TableCell><TableCell>Base Tips</TableCell><TableCell>Given</TableCell>
              <TableCell>Received</TableCell><TableCell>Final Tips</TableCell><TableCell>Total Pay</TableCell>
              <TableCell>Eff. Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entry.tipCalculations.map((calc) => (
              <TableRow key={calc.id}>
                <TableCell>{calc.employee.name}</TableCell>
                <TableCell>{calc.roleOnDay}</TableCell>
                <TableCell>{calc.shiftAssignments.map((sa) => sa.shift.name).join(', ')}</TableCell>
                <TableCell>{calc.totalHours}</TableCell>
                <TableCell>{fmt(calc.baseTips)}</TableCell>
                <TableCell>{fmt(calc.supportTipsGiven)}</TableCell>
                <TableCell>{fmt(calc.supportTipsReceived)}</TableCell>
                <TableCell><strong>{fmt(calc.finalTips)}</strong></TableCell>
                <TableCell>{fmt(calc.totalPay)}</TableCell>
                <TableCell>{fmt(calc.effectiveHourlyRate)}/hr</TableCell>
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
        message={`This will send tip summary emails to all ${entry.tipCalculations.length} employee(s) for ${entry.entryDate}. This cannot be undone.`}
        onConfirm={handlePublish}
        onCancel={() => setConfirmPublish(false)}
      />
      <ConfirmDialog open={confirmDelete} title="Delete Tip Entry" message="This will soft-delete the entry." onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} />
    </Box>
  );
}
