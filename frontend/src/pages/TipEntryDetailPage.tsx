import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Chip, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTipEntry, useDeleteTipEntry } from '../api/tips';
import ConfirmDialog from '../components/ConfirmDialog';

export default function TipEntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useTipEntry(id!);
  const deleteMut = useDeleteTipEntry();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    await deleteMut.mutateAsync(id!);
    navigate('/tips');
  };

  if (isLoading) return <Typography>Loading...</Typography>;
  if (!entry) return <Typography>Entry not found</Typography>;

  const cashTips = entry.closingDrawer - entry.startingDrawer - entry.cashSales;
  const totalPool = cashTips + entry.electronicTips;
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/tips')} sx={{ mb: 2 }}>Back to Entries</Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>Tip Entry: {entry.entryDate}</Typography>
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

      <Button color="error" variant="outlined" onClick={() => setConfirmDelete(true)}>Delete Entry</Button>
      <ConfirmDialog open={confirmDelete} title="Delete Tip Entry" message="This will soft-delete the entry." onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} />
    </Box>
  );
}
