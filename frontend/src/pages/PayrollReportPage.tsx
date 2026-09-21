import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert, Box, Button, CircularProgress, Link, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { usePayrollReport } from '../api/payroll';
import { useTenant } from '../context/TenantContext';
import { downloadCsv } from '../utils/csv';
import { localDate } from '../utils/dates';

const fmt = (n: number) => `$${n.toFixed(2)}`;

export default function PayrollReportPage() {
  const { slug } = useTenant();
  const [startDate, setStartDate] = useState(() => localDate(13));
  const [endDate, setEndDate] = useState(() => localDate());

  const validRange = !!startDate && !!endDate && startDate <= endDate;
  const { data: report, isFetching, error } = usePayrollReport(validRange ? startDate : '', validRange ? endDate : '');

  const handleDownload = () => {
    if (!report) return;
    downloadCsv(`tips_${slug}_${startDate}_to_${endDate}.csv`, [
      ['Employee', 'Email', 'Days Worked', 'Hours', 'Total Tips'],
      ...report.employees.map((e) => [e.name, e.email, e.daysWorked, e.hours, e.totalTips.toFixed(2)]),
    ]);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Payroll Report</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Total tips per employee from published entries in the date range.
      </Typography>

      <Stack direction="row" spacing={2} useFlexGap sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField
          label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }}
          error={!!startDate && !!endDate && !validRange} helperText={!!startDate && !!endDate && !validRange ? 'Must be on or after the start date' : ' '}
        />
        {isFetching && <CircularProgress size={24} sx={{ mt: 2 }} />}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{(error as Error).message}</Alert>}

      {report && (
        <>
          {report.unpublished.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {report.unpublished.length} {report.unpublished.length === 1 ? 'entry in this range is' : 'entries in this range are'} not published and not included:{' '}
              {report.unpublished.map((u, i) => (
                <span key={u.id}>
                  {i > 0 && ', '}
                  <Link component={RouterLink} to={`/${slug}/tips/${u.id}`}>{u.entryDate}</Link>
                </span>
              ))}
            </Alert>
          )}

          {report.employees.length === 0 ? (
            <Alert severity="info">No published entries in this date range.</Alert>
          ) : (
            <>
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell><TableCell>Email</TableCell>
                      <TableCell align="right">Days</TableCell><TableCell align="right">Hours</TableCell>
                      <TableCell align="right">Total Tips</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.employees.map((e) => (
                      <TableRow key={e.employeeId}>
                        <TableCell>{e.name}</TableCell>
                        <TableCell>{e.email}</TableCell>
                        <TableCell align="right">{e.daysWorked}</TableCell>
                        <TableCell align="right">{e.hours}</TableCell>
                        <TableCell align="right"><strong>{fmt(e.totalTips)}</strong></TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4}><strong>Total ({report.publishedEntries} published {report.publishedEntries === 1 ? 'entry' : 'entries'})</strong></TableCell>
                      <TableCell align="right"><strong>{fmt(report.totalTips)}</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>Download CSV</Button>
            </>
          )}
        </>
      )}
    </Box>
  );
}
