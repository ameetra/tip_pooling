import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, IconButton, MenuItem, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, Chip, CircularProgress, Stack,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useEmployees } from '../api/employees';
import { useTipPreview, useCreateTipEntry } from '../api/tips';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import type { EmployeeRole, TipEntryInput, EmployeeResult } from '../types';
import { ROLE_OPTIONS, formatRole } from '../constants/roles';
import { localDate } from '../utils/dates';

interface EmployeeRow {
  employeeId: string;
  role: EmployeeRole;
  hoursWorked: string;
}

const today = localDate();

// Digits with an optional decimal point and at most 2 decimal places.
const MONEY = /^\d*\.?\d{0,2}$/;
const amount = (s: string) => Number(s) || 0;

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
  const { user } = useAuth();
  const { slug } = useTenant();
  const isShiftLead = user?.role === 'SHIFT_LEAD';
  const { data: employees = [] } = useEmployees();
  const preview = useTipPreview();
  const createEntry = useCreateTipEntry();

  const [entryDate, setEntryDate] = useState(today);
  const [cashInRegister, setCashInRegister] = useState('');
  const [cashSales, setCashSales] = useState('');
  const [cashTips, setCashTips] = useState('');
  const [posTips, setPosTips] = useState('');
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setEntryDate(today);
    setCashInRegister('');
    setCashSales('');
    setCashTips('');
    setPosTips('');
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
    return {
      entryDate,
      cashInRegister: amount(cashInRegister),
      cashSales: amount(cashSales),
      cashTips: amount(cashTips),
      posTips: amount(posTips),
      employees: emps.map((r) => ({ employeeId: r.employeeId, role: r.role, hoursWorked: Number(r.hoursWorked) })),
    };
  }, [entryDate, cashInRegister, cashSales, cashTips, posTips, rows]);

  const handlePreview = () => {
    const input = buildInput();
    if (input) preview.mutate(input);
  };

  const handleSubmit = async () => {
    const input = buildInput();
    if (!input) return;
    try {
      const result: any = await createEntry.mutateAsync(input);
      if (isShiftLead) {
        resetForm();
        setSuccess(`Entry saved for ${input.entryDate}.`);
      } else {
        navigate(`/${slug}/tips/${result.id}`);
      }
    } catch (e: any) { setError(e.message); }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>New Tip Entry</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Date + Cash inputs */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }} useFlexGap>
          <TextField label="Date" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
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
        {rows.map((row, i) => (
          <Stack key={i} direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
            <TextField select label="Employee" value={row.employeeId} onChange={(e) => updateRow(i, 'employeeId', e.target.value)} sx={{ minWidth: 200 }}>
              {employees.map((e) => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
            </TextField>
            <TextField select label="Role" value={row.role} onChange={(e) => updateRow(i, 'role', e.target.value)} sx={{ width: 140 }}>
              {ROLE_OPTIONS.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>
            <TextField label="Hours" type="number" value={row.hoursWorked} onChange={(e) => updateRow(i, 'hoursWorked', e.target.value)} slotProps={{ htmlInput: { min: 0.5, max: 24, step: 0.5 } }} sx={{ width: 110 }} />
            <IconButton onClick={() => removeRow(i)}><DeleteIcon /></IconButton>
          </Stack>
        ))}
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

      <Button variant="contained" size="large" onClick={handleSubmit} disabled={createEntry.isPending || !buildInput()}>
        {createEntry.isPending ? 'Saving...' : 'Save Tip Entry'}
      </Button>
    </Box>
  );
}

function PreviewTable({ results, showPay }: { results: EmployeeResult[]; showPay: boolean }) {
  const fmt = (n: number) => `$${n.toFixed(2)}`;
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
