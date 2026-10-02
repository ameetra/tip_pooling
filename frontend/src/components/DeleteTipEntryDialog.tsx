import { useEffect, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Stack, TextField,
} from '@mui/material';
import type { DeleteReason } from '../types';
import { DELETE_REASON_LABELS, deleteEntryMessage } from '../utils/tipEntry';

interface Props {
  entry?: { entryDate: string; publishedAt: string | null };
  onConfirm: (why?: { reason: DeleteReason; note: string }) => Promise<unknown>;
  onCancel: () => void;
}

// Deleting a published entry asks why, so admins can see who keeps needing corrections (PRD 3.11).
export default function DeleteTipEntryDialog({ entry, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState<DeleteReason | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const published = !!entry?.publishedAt;
  const canDelete = !busy && (!published || (reason && note.trim()));

  useEffect(() => { setReason(''); setNote(''); setError(''); }, [entry]);

  const handleDelete = async () => {
    setBusy(true);
    try {
      await onConfirm(published ? { reason: reason as DeleteReason, note: note.trim() } : undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!entry} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>Delete Tip Entry</DialogTitle>
      <DialogContent>
        <DialogContentText>{deleteEntryMessage(entry)}</DialogContentText>
        {published && (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField select label="Reason" value={reason} onChange={(e) => setReason(e.target.value as DeleteReason)} required>
              {Object.entries(DELETE_REASON_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
            <TextField
              label="What was wrong?" value={note} onChange={(e) => setNote(e.target.value)} required multiline minRows={2}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
          </Stack>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleDelete} color="error" variant="contained" disabled={!canDelete}>Delete</Button>
      </DialogActions>
    </Dialog>
  );
}
