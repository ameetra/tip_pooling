import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, IconButton, MenuItem, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, Chip, CircularProgress, Stack,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import { useEmployees } from '../api/employees';
import { useTipPreview, useCreateTipEntry, useTipEntry, useEditTipEntry, usePublishTipEntry } from '../api/tips';
import ConfirmDialog from '../components/ConfirmDialog';
import { useShiftHoursConfig } from '../api/shift-hours';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import type { Employee, EmployeeRole, ShiftHoursDay, TipEntryInput, EmployeeResult } from '../types';
import { isShiftLead as isShiftLeadRole, useRoleLabels } from '../constants/roles';
import { localDate } from '../utils/dates';

const SHIFT_HOURS_DAYS: ShiftHoursDay[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
// entryDate is a plain YYYY-MM-DD string; parsing at noon UTC avoids the date shifting a day
// backward in timezones behind UTC when just `new Date(entryDate)` is used.
const dayOfWeek = (entryDate: string): ShiftHoursDay => SHIFT_HOURS_DAYS[new Date(`${entryDate}T12:00:00Z`).getUTCDay()];

interface EmployeeRow {
  employeeId: string;
  role: EmployeeRole;
  hoursWorked: string;
}

const today = localDate();

// Digits with an optional decimal point and at most 2 decimal places.
const MONEY = /^\d*\.?\d{0,2}$/;
const amount = (s: string) => Number(s) || 0;

// Only roles the employee has a rate for (plus their primary role's legacy rate); the server rejects any other.
const rolesOf = (emp: Employee) => new Set<string>([emp.role, ...(emp.roleRates ?? []).map((r) => r.role)]);

function MoneyField({ label, value, onChange, required, helperText }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; helperText?: string;
}) {
  return (
    <TextField
      label={label} value={value} required={required} helperText={helperText} placeholder="0.00"
      onChange={(e) => MONEY.test(e.target.value) && onChange(e.target.value)}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: 'decimal' } }}
    />
  );
}

export default function TipEntryFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { data: existing, isLoading } = useTipEntry(id ?? '');
  const { user } = useAuth();
  const { slug } = useTenant();
  const { roleOptions } = useRoleLabels();
  const isShiftLead = isShiftLeadRole(user?.role);
  const { data: employees = [] } = useEmployees();
  const { data: shiftHoursConfig } = useShiftHoursConfig();
  const isPerPerson = shiftHoursConfig?.supportSplitMode === 'PER_PERSON';
  const preview = useTipPreview();
  const createEntry = useCreateTipEntry();
  const editEntry = useEditTipEntry();
  const publishEntry = usePublishTipEntry();
  const saving = createEntry.isPending || editEntry.isPending;

  const [entryDate, setEntryDate] = useState(today);
  const [cashInRegister, setCashInRegister] = useState('');
  const [cashSales, setCashSales] = useState('');
  const [cashTips, setCashTips] = useState('');
  const [posTips, setPosTips] = useState('');
  const [shiftHours, setShiftHours] = useState('');
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [error, setError] = useState('');
  // A shift lead's just-saved entry, summarized here for publishing since they can't open the entry detail page.
  const [saved, setSaved] = useState<{ id: string; entryDate: string; totalPool: number; results: EmployeeResult[]; published?: string } | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);

  // Fill the form once from the saved draft; later refetches must not wipe the manager's changes.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!existing || prefilled.current) return;
    prefilled.current = true;
    setEntryDate(existing.entryDate);
    setCashInRegister(String(existing.cashInRegister));
    setCashSales(String(existing.cashSales));
    setCashTips(String(existing.cashTips));
    setPosTips(String(existing.posTips));
    setShiftHours(existing.shiftHours != null ? String(existing.shiftHours) : '');
    // One calculation row per stint, so a person who worked two roles comes back as two rows.
    setRows(existing.tipCalculations.map((c) => ({
      employeeId: c.employeeId, role: c.roleOnDay as EmployeeRole, hoursWorked: String(c.totalHours),
    })));
  }, [existing]);

  // Auto-fill from the venue's day-of-week default whenever the date changes; still editable
  // afterward for early closes, same as the old paper form's instructions. Drafts keep their saved value.
  useEffect(() => {
    if (isEdit || !isPerPerson || !shiftHoursConfig) return;
    const def = shiftHoursConfig.defaults[dayOfWeek(entryDate)];
    setShiftHours(def != null ? String(def) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryDate, isPerPerson, shiftHoursConfig]);

  const resetForm = () => {
    setEntryDate(today);
    setCashInRegister('');
    setCashSales('');
    setCashTips('');
    setPosTips('');
    setShiftHours('');
    setRows([]);
    preview.reset();
  };

  const drawerOverage = amount(cashInRegister) - amount(cashSales);
  const cashTipsTotal = drawerOverage + amount(cashTips);
  const totalPool = cashTipsTotal + amount(posTips);

  const addRow = () => setRows([...rows, { employeeId: '', role: 'SERVER', hoursWorked: '' }]);
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof EmployeeRow, value: string) => {
    const next = [...rows];
    (next[i] as any)[field] = value;
    if (field === 'employeeId') {
      const emp = employees.find((e) => e.id === value);
      if (emp) next[i].role = emp.role;
    }
    setRows(next);
  };

  const buildInput = useCallback((): TipEntryInput | null => {
    const emps = rows.filter((r) => r.employeeId && Number(r.hoursWorked) > 0);
    if (!emps.length || cashInRegister === '' || posTips === '') return null;
    if (isPerPerson && !(Number(shiftHours) > 0)) return null;
    return {
      entryDate,
      cashInRegister: amount(cashInRegister),
      cashSales: amount(cashSales),
      cashTips: amount(cashTips),
      posTips: amount(posTips),
      ...(isPerPerson ? { shiftHours: Number(shiftHours) } : {}),
      employees: emps.map((r) => ({ employeeId: r.employeeId, role: r.role, hoursWorked: Number(r.hoursWorked) })),
    };
  }, [entryDate, cashInRegister, cashSales, cashTips, posTips, shiftHours, isPerPerson, rows]);

  const handlePreview = () => {
    const input = buildInput();
    setError('');
    if (input) preview.mutate(input, { onError: (e) => setError(e.message) });
  };

  const handlePublish = async () => {
    setConfirmPublish(false);
    try {
      const { emailsSent, emailsFailed } = await publishEntry.mutateAsync(saved!.id);
      setSaved({ ...saved!, published: `${emailsSent} email(s) sent${emailsFailed ? `, ${emailsFailed} failed` : ''}.` });
    } catch (e) { setError((e as Error).message); }
  };

  const handleSubmit = async () => {
    const input = buildInput();
    if (!input) return;
    setError('');
    try {
      if (isEdit) {
        const updated = await editEntry.mutateAsync({ id: id!, data: input });
        navigate(`/${slug}/tips/${updated.id}`);
        return;
      }
      const result: any = await createEntry.mutateAsync(input);
      if (isShiftLead) {
        setSaved({ id: result.id, entryDate: input.entryDate, totalPool, results: result.results });
        resetForm();
      } else {
        navigate(`/${slug}/tips/${result.id}`);
      }
    } catch (e: any) { setError(e.message); }
  };

  if (isEdit && isLoading) return <Typography>Loading...</Typography>;
  if (isEdit && !existing) return <Typography>Entry not found</Typography>;
  if (existing?.publishedAt) {
    return (
      <Alert severity="info" action={<Button onClick={() => navigate(`/${slug}/tips/${id}`)}>Back</Button>}>
        This entry was published and can't be edited. To correct it, delete it and enter the day again.
      </Alert>
    );
  }

  // Laid out like the manager's entry detail page, minus pay figures and the edit/delete actions shift leads can't use.
  if (saved) {
    return (
      <Box>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {saved.published && <Alert severity="success" sx={{ mb: 2 }}>Published! {saved.published}</Alert>}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="h5">Tip Entry: {saved.entryDate}</Typography>
              {saved.published ? <Chip label="Published" color="success" /> : <Chip label="Draft" />}
            </Box>
            <Chip label={`Total Pool: $${saved.totalPool.toFixed(2)}`} color="primary" />
          </CardContent>
        </Card>
        <Typography variant="h6" sx={{ mb: 1 }}>Calculation Breakdown</Typography>
        <Paper sx={{ mb: 3 }}><PreviewTable results={saved.results} showPay={false} /></Paper>
        {!saved.published && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>Saved as a draft. Publish to email everyone their tips, or leave it for a manager to publish.</Typography>
        )}
        <Stack direction="row" spacing={2}>
          {!saved.published && (
            <Button variant="contained" color="success" startIcon={<SendIcon />} disabled={publishEntry.isPending} onClick={() => setConfirmPublish(true)}>
              {publishEntry.isPending ? 'Publishing...' : 'Publish & Send Emails'}
            </Button>
          )}
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => { setSaved(null); setError(''); }}>New Tip Entry</Button>
        </Stack>
        <ConfirmDialog
          open={confirmPublish}
          title="Publish & Send Emails"
          message={`This will send tip summary emails to all ${saved.results.length} employee(s) for ${saved.entryDate}. This cannot be undone.`}
          onConfirm={handlePublish}
          onCancel={() => setConfirmPublish(false)}
          confirmLabel="Publish & Send"
          confirmColor="success"
        />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>{isEdit ? 'Edit Tip Entry' : 'New Tip Entry'}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Date + Cash inputs */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }} useFlexGap>
          <TextField label="Date" type="date" value={entryDate} disabled={isEdit} onChange={(e) => setEntryDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          {isPerPerson && (
            <TextField
              label="Total Shift Hours" type="number" value={shiftHours} required
              onChange={(e) => setShiftHours(e.target.value)}
              helperText="Hours the shift was open — override for an early close"
              slotProps={{ htmlInput: { min: 0.5, max: 24, step: 0.5 } }} sx={{ width: 160 }}
            />
          )}
          <MoneyField label="Cash in Register" value={cashInRegister} onChange={setCashInRegister} required helperText="After removing the starting float" />
          <MoneyField label="Cash Sales (POS)" value={cashSales} onChange={setCashSales} />
          <MoneyField label="Cash Tips (jar)" value={cashTips} onChange={setCashTips} />
          <MoneyField label="POS Tips" value={posTips} onChange={setPosTips} required />
        </Stack>
        <Stack direction="row" spacing={3} sx={{ mt: 2, flexWrap: 'wrap' }} useFlexGap>
          <Chip label={`Drawer Overage: $${drawerOverage.toFixed(2)}`} variant="outlined" />
          <Chip label={`Cash Tips Total: $${cashTipsTotal.toFixed(2)}`} color="info" />
          <Chip label={`Total Pool: $${totalPool.toFixed(2)}`} color="primary" />
        </Stack>
      </Paper>

      {/* Employee Rows — same person may appear in multiple roles */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">Employees</Typography>
          <Button startIcon={<AddIcon />} onClick={addRow} disabled={employees.length === 0}>Add Row</Button>
        </Box>
        {rows.map((row, i) => {
          const emp = employees.find((e) => e.id === row.employeeId);
          // Keep the row's current role listed so a draft saved before a role was removed still displays.
          const roles = emp && rolesOf(emp).add(row.role);
          return (
            <Stack key={i} direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
              <TextField select label="Employee" value={row.employeeId} onChange={(e) => updateRow(i, 'employeeId', e.target.value)} sx={{ minWidth: 200 }}>
                {employees.map((e) => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
              </TextField>
              <TextField select label="Role" value={row.role} onChange={(e) => updateRow(i, 'role', e.target.value)} sx={{ width: 140 }}>
                {roleOptions.filter((r) => !roles || roles.has(r.value)).map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </TextField>
              <TextField label="Hours" type="number" value={row.hoursWorked} onChange={(e) => updateRow(i, 'hoursWorked', e.target.value)} slotProps={{ htmlInput: { min: 0.5, max: 24, step: 0.5 } }} sx={{ width: 110 }} />
              <IconButton onClick={() => removeRow(i)}><DeleteIcon /></IconButton>
            </Stack>
          );
        })}
        {rows.length === 0 && <Typography color="text.secondary">Add rows to calculate tips. The same person can be added more than once for different roles.</Typography>}
      </Paper>

      {/* Preview */}
      <Box sx={{ mb: 3 }}>
        <Button variant="outlined" startIcon={<VisibilityIcon />} onClick={handlePreview} disabled={preview.isPending || !buildInput()} sx={{ mb: 2 }}>
          {preview.isPending ? 'Calculating...' : 'Preview Tips'}
        </Button>
        {preview.data && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Preview {preview.isPending && <CircularProgress size={16} sx={{ ml: 1 }} />}
            </Typography>
            <PreviewTable results={preview.data.results} showPay={!isShiftLead} />
          </Paper>
        )}
      </Box>

      <Stack direction="row" spacing={2}>
        <Button variant="contained" size="large" onClick={handleSubmit} disabled={saving || !buildInput()}>
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Tip Entry'}
        </Button>
        {isEdit && <Button size="large" onClick={() => navigate(`/${slug}/tips/${id}`)}>Cancel</Button>}
      </Stack>
    </Box>
  );
}

function PreviewTable({ results, showPay }: { results: EmployeeResult[]; showPay: boolean }) {
  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const { formatRole } = useRoleLabels();
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell><TableCell>Role(s)</TableCell><TableCell>Hours</TableCell>
            {showPay && <TableCell>Wages</TableCell>}
            <TableCell>Tips</TableCell>
            {showPay && <><TableCell>Total Pay</TableCell><TableCell>$/hr</TableCell></>}
          </TableRow>
        </TableHead>
        <TableBody>
          {results.map((r) => (
            <TableRow key={r.employeeId}>
              <TableCell>{r.name}</TableCell>
              <TableCell>{r.roles.map(formatRole).join(', ')}</TableCell>
              <TableCell>{r.totalHours}</TableCell>
              {showPay && <TableCell>{fmt(r.totalWage)}</TableCell>}
              <TableCell><strong>{fmt(r.totalTips)}</strong></TableCell>
              {showPay && <><TableCell>{fmt(r.totalPay)}</TableCell><TableCell>{fmt(r.effectiveHourlyRate)}/hr</TableCell></>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
