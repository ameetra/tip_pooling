import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import type { BillField, CashCountRow } from '../types';
import { useDeleteCashCount, useSaveCashCount } from '../api/cash-counts';
import { BILLS, cents, money, signedMoney } from '../utils/cash';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  row: CashCountRow;
  defaultDeposit: string;
  onSaved: (deposit: string) => void;
  onClose: () => void;
}

type Fields = Record<BillField | 'coins' | 'deposit' | 'comments', string>;

const isBillCount = (v: string) => v === '' || /^\d{1,5}$/.test(v);
const isCoins = (v: string) => v === '' || /^\d{1,5}(\.\d{0,2})?$/.test(v);
const num = (v: string) => Number(v || 0);

export default function CashCountDialog({ row, defaultDeposit, onSaved, onClose }: Props) {
  const fullScreen = useMediaQuery(useTheme().breakpoints.down('sm'));
  const { count } = row;
  const [f, setF] = useState<Fields>(() => ({
    ...Object.fromEntries(BILLS.map(([k]) => [k, count?.[k] ? String(count[k]) : ''])) as Record<BillField, string>,
    coins: count?.coins ? String(count.coins) : '',
    deposit: count ? count.deposit ?? '' : defaultDeposit,
    comments: count?.comments ?? '',
  }));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useSaveCashCount();
  const remove = useDeleteCashCount();

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const valid = BILLS.every(([k]) => isBillCount(f[k])) && isCoins(f.coins);
  // Saving re-reads Cash in Register from the tip entry, so a recount compares against today's figure.
  const expected = row.currentExpected ?? count!.expectedAmount;
  const totalCents = BILLS.reduce((sum, [k, face]) => sum + num(f[k]) * face * 100, 0) + cents(num(f.coins));
  const variance = (totalCents - cents(expected)) / 100;

  const handleSave = async () => {
    await save.mutateAsync({
      id: count?.id, entryDate: row.entryDate,
      ...Object.fromEntries(BILLS.map(([k]) => [k, num(f[k])])) as Record<BillField, number>,
      coins: num(f.coins), deposit: f.deposit, comments: f.comments,
    });
    onSaved(f.deposit.trim());
  };

  const handleDelete = async () => {
    await remove.mutateAsync(count!.id);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle>{count ? 'Edit count' : 'Count drop'}: {row.entryDate}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Expected (Cash in Register): <b>{money(expected)}</b>
        </Typography>
        {row.noEntry && <Alert severity="warning" sx={{ mb: 2 }}>This day's tip entry was deleted. Expected is the amount when it was counted.</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: '48px 1fr 88px', columnGap: 1.5, rowGap: 1, alignItems: 'center' }}>
          {BILLS.map(([k, face]) => (
            <Box key={k} sx={{ display: 'contents' }}>
              <Typography sx={{ fontWeight: 500 }}>${face}</Typography>
              <TextField
                size="small" placeholder="0" value={f[k]} onChange={set(k)} error={!isBillCount(f[k])}
                slotProps={{ htmlInput: { inputMode: 'numeric', 'aria-label': `Number of $${face} bills` } }}
              />
              <Typography align="right" color="text.secondary">{money(num(f[k]) * face)}</Typography>
            </Box>
          ))}
          <Typography sx={{ fontWeight: 500 }}>Coins</Typography>
          <TextField
            size="small" placeholder="0.00" value={f.coins} onChange={set('coins')} error={!isCoins(f.coins)}
            slotProps={{ htmlInput: { inputMode: 'decimal', 'aria-label': 'Coins in dollars' } }}
          />
          <Typography align="right" color="text.secondary">{money(num(f.coins))}</Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 600 }}>Counted {money(totalCents / 100)}</Typography>
          <Typography sx={{ fontWeight: 600, color: variance === 0 ? 'success.main' : variance < 0 ? 'error.main' : 'warning.main' }}>
            {variance === 0 ? 'Matches' : `${variance < 0 ? 'Short' : 'Over'} ${signedMoney(variance)}`}
          </Typography>
        </Box>

        <TextField label="Deposit" size="small" fullWidth sx={{ mt: 2 }} value={f.deposit} onChange={set('deposit')}
          helperText="Optional, e.g. the bank deposit number" slotProps={{ htmlInput: { maxLength: 50 } }} />
        <TextField label="Comments" size="small" fullWidth multiline minRows={2} sx={{ mt: 2 }} value={f.comments} onChange={set('comments')}
          helperText="Optional, e.g. -80 Electrician" slotProps={{ htmlInput: { maxLength: 500 } }} />

        {(save.error || remove.error) && <Alert severity="error" sx={{ mt: 2 }}>{(save.error || remove.error)!.message}</Alert>}
      </DialogContent>
      <DialogActions>
        {count && <Button color="error" onClick={() => setConfirmDelete(true)} sx={{ mr: 'auto' }}>Delete</Button>}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!valid || save.isPending}>Save</Button>
      </DialogActions>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete count"
        message={`Delete the count for ${row.entryDate}? The drop will show as not counted (the deleted count is kept in the audit trail).`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        confirmLabel="Delete"
      />
    </Dialog>
  );
}
