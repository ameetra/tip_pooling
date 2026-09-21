import { Box, Card, CardContent, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useQuery } from '@tanstack/react-query';
import { get } from '../api/client';

interface TipRecord {
  date: string;
  role: string;
  hours: number;
  hourlyPay: number;
  tips: number;
  totalPay: number;
  effectiveHourlyRate: number;
}

interface MyHistoryResponse {
  restaurantName: string;
  records: TipRecord[];
}

const fmt = (n: number) => `$${n.toFixed(2)}`;
const fmtDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function Line({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: highlight ? 600 : 400, color: highlight ? 'success.main' : 'text.primary' }}>
        {value}
      </Typography>
    </Stack>
  );
}

export default function EmployeeTipHistoryPage() {
  const { data, isLoading } = useQuery<MyHistoryResponse>({
    queryKey: ['my-history'],
    queryFn: () => get('/tips/my-history'),
  });

  const records = data?.records ?? [];
  const totalTips = records.reduce((s, r) => s + r.tips, 0);
  const totalPay = records.reduce((s, r) => s + r.totalPay, 0);

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', p: 3 }}>
      {data?.restaurantName && (
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
          {data.restaurantName}
        </Typography>
      )}
      <Typography variant="h5" sx={{ fontWeight: 600 }} gutterBottom>My Tip History</Typography>
      <Typography variant="body2" color="text.secondary">Last 90 days</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
        Effective hourly rate = total pay (wages + tips) ÷ hours worked.
      </Typography>

      {isLoading && <CircularProgress />}

      {!isLoading && records.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <ReceiptLongIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography>No tip records yet.</Typography>
        </Box>
      )}

      {!isLoading && records.length > 0 && (
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
            {records.map((r) => (
              <Card key={r.date} variant="outlined">
                <CardContent>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 600 }}>{fmtDate(r.date)}</Typography>
                    <Chip label={r.role} size="small" variant="outlined" />
                  </Stack>

                  <Divider sx={{ my: 1 }} />

                  {/* Same rows and labels as the tip email. */}
                  <Line label="Hours worked" value={r.hours.toFixed(1)} />
                  <Line label="Wages" value={fmt(r.hourlyPay)} />
                  <Line label="Tips earned" value={fmt(r.tips)} highlight />
                  <Line label="Total pay (wages + tips)" value={fmt(r.totalPay)} />
                  <Line label="Effective hourly rate" value={`${fmt(r.effectiveHourlyRate)}/hr`} />
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}
