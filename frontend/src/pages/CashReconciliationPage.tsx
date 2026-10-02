import { useState } from 'react';
import {
  Alert, Box, Chip, Link, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableFooter, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import { useCashCounts } from '../api/cash-counts';
import CashCountDialog from '../components/CashCountDialog';
import type { CashCountRow } from '../types';
import { cents, money, signedMoney } from '../utils/cash';
import { localDate } from '../utils/dates';

const STATUS = {
  NOT_COUNTED: { label: 'Not counted', color: 'default' },
  MATCHES: { label: 'Matches', color: 'success' },
  SHORT: { label: 'Short', color: 'error' },
  OVER: { label: 'Over', color: 'warning' },
} as const;

const sum = (ns: number[]) => ns.reduce((s, n) => s + cents(n), 0) / 100;

export default function CashReconciliationPage() {
  const [since, setSince] = useState(() => localDate(13));
  const [deposit, setDeposit] = useState('');
  // A week's envelopes usually go to the bank together, so new counts start with the last deposit used.
  const [lastDeposit, setLastDeposit] = useState('');
  const [selected, setSelected] = useState<CashCountRow | null>(null);
  const { data: rows = [], isFetching, error } = useCashCounts(since, deposit);

  const counted = rows.filter((r) => r.count);
  const uncounted = rows.length - counted.length;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Cash Reconciliation</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Count each drop envelope and compare it with the day's Cash in Register. Click a row to count it.
      </Typography>

      <Stack direction="row" spacing={2} useFlexGap sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {deposit ? (
          <Chip label={`Deposit ${deposit}`} onDelete={() => setDeposit('')} color="primary" />
        ) : (
          <>
            <TextField
              label="Show drops from" type="date" size="small" value={since}
              onChange={(e) => setSince(e.target.value)} slotProps={{ inputLabel: { shrink: true } }}
            />
            <Typography variant="body2" color="text.secondary">
              Plus any drop from the last 60 days not counted yet. Click a deposit to see just that deposit.
            </Typography>
          </>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
      {uncounted > 0 && <Alert severity="info" sx={{ mb: 2 }}>{uncounted} {uncounted === 1 ? 'drop is' : 'drops are'} not counted yet.</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">Expected</TableCell>
              <TableCell align="right">Counted</TableCell>
              <TableCell align="right">Over/Under</TableCell>
              <TableCell>Deposit</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.entryDate} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(r)}>
                <TableCell>{r.entryDate}</TableCell>
                <TableCell align="right">{money(r.count?.expectedAmount ?? r.currentExpected ?? 0)}</TableCell>
                <TableCell align="right">{r.count ? money(r.count.countedTotal) : '—'}</TableCell>
                <TableCell align="right" sx={{ color: !r.variance ? undefined : r.variance < 0 ? 'error.main' : 'warning.main' }}>
                  {r.variance === null ? '—' : signedMoney(r.variance)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {r.count?.deposit && <Link component="button" onClick={() => setDeposit(r.count!.deposit!)}>{r.count.deposit}</Link>}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    <Chip size="small" label={STATUS[r.status].label} color={STATUS[r.status].color} />
                    {r.entryChanged && (
                      <Tooltip title={`Cash in Register is now ${money(r.currentExpected!)}. Recount (edit and save) to compare against it.`}>
                        <Chip size="small" variant="outlined" color="warning" label="Entry changed since count" />
                      </Tooltip>
                    )}
                    {r.noEntry && <Chip size="small" variant="outlined" color="warning" label="No tip entry" />}
                    {r.count?.comments && (
                      <Tooltip title={r.count.comments}><Chip size="small" variant="outlined" label="Comment" /></Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">{isFetching ? 'Loading...' : 'No drops in this range.'}</TableCell>
              </TableRow>
            )}
          </TableBody>
          {counted.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell>Total ({counted.length} counted)</TableCell>
                <TableCell align="right">{money(sum(counted.map((r) => r.count!.expectedAmount)))}</TableCell>
                <TableCell align="right">{money(sum(counted.map((r) => r.count!.countedTotal)))}</TableCell>
                <TableCell align="right">{signedMoney(sum(counted.map((r) => r.variance!)))}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>

      {selected && (
        <CashCountDialog
          row={selected}
          defaultDeposit={lastDeposit}
          onSaved={(d) => { setLastDeposit(d); setSelected(null); }}
          onClose={() => setSelected(null)}
        />
      )}
    </Box>
  );
}
