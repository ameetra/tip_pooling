import { Box, Card, CardContent, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useQuery } from '@tanstack/react-query';
import { get } from '../api/client';

interface TipRecord {
  date: string;
  role: string;
  shifts: string[];
  hours: number;
  hourlyPay: number;
  tips: number;
  totalPay: number;
  effectiveHourlyRate: number;
}

const fmt = (n: number) => `$${n.toFixed(2)}`;
const fmtDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export default function EmployeeTipHistoryPage() {
  const { data = [], isLoading } = useQuery<TipRecord[]>({
    queryKey: ['my-history'],
    queryFn: () => get('/tips/my-history'),
  });

  const totalTips = data.reduce((s, r) => s + r.tips, 0);
  const totalPay = data.reduce((s, r) => s + r.totalPay, 0);

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 600 }} gutterBottom>My Tip History</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Last 30 days</Typography>

      {isLoading && <CircularProgress />}

      {!isLoading && data.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <ReceiptLongIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography>No tip records yet.</Typography>
        </Box>
      )}

      {!isLoading && data.length > 0 && (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ py: '12px !important' }}>
                <Typography variant="caption" color="text.secondary">Total Tips</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>{fmt(totalTips)}</Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ py: '12px !important' }}>
                <Typography variant="caption" color="text.secondary">Total Pay</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{fmt(totalPay)}</Typography>
              </CardContent>
            </Card>
          </Stack>

          <Stack spacing={2}>
            {data.map((r) => (
              <Card key={r.date} variant="outlined">
                <CardContent>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{fmtDate(r.date)}</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip label={r.role} size="small" variant="outlined" />
                        {r.shifts.map(s => <Chip key={s} label={s} size="small" />)}
                      </Stack>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontWeight: 600, color: 'success.main' }}>{fmt(r.tips)} tips</Typography>
                      <Typography variant="body2" color="text.secondary">{fmt(r.totalPay)} total</Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 1.5 }} />

                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {r.hours}h × {fmt(r.effectiveHourlyRate)}/hr effective
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{fmt(r.hourlyPay)} wages</Typography>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}
