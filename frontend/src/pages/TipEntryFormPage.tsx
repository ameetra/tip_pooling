import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, IconButton, MenuItem, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, Chip, CircularProgress, Stack,
  Autocomplete, Checkbox,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useEmployees } from '../api/employees';
import { useShifts } from '../api/shifts';
import { useTipPreview, useCreateTipEntry } from '../api/tips';
import type { EmployeeRole, TipEntryInput, TipCalculationResult, Shift } from '../types';

interface EmployeeRow {
  employeeId: string;
  roleOnDay: EmployeeRole;
  hoursWorked: string;
  shiftIds: string[];
}

const today = new Date().toISOString().slice(0, 10);

export default function TipEntryFormPage() {
  const navigate = useNavigate();
  const { data: employees = [] } = useEmployees();
  const { data: shifts = [] } = useShifts();
  const preview = useTipPreview();
  const createEntry = useCreateTipEntry();

  const [entryDate, setEntryDate] = useState(today);
  const [startingDrawer, setStartingDrawer] = useState('');
  const [closingDrawer, setClosingDrawer] = useState('');
  const [cashSales, setCashSales] = useState('0');
  const [electronicTips, setElectronicTips] = useState('');
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [error, setError] = useState('');

  const cashTips = Math.max(0, Number(closingDrawer) - Number(startingDrawer) - Number(cashSales));
  const totalPool = cashTips + Number(electronicTips || 0);

  const addRow = () => setRows([...rows, { employeeId: '', roleOnDay: 'SERVER', hoursWorked: '', shiftIds: [] }]);
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof EmployeeRow, value: any) => {
    const next = [...rows];
    (next[i] as any)[field] = value;
    // Auto-set role from employee record
    if (field === 'employeeId') {
      const emp = employees.find((e) => e.id === value);
      if (emp) next[i].roleOnDay = emp.role;
    }
    setRows(next);
  };

  const buildInput = useCallback((): TipEntryInput | null => {
    const emps = rows.filter((r) => r.employeeId && r.shiftIds.length && Number(r.hoursWorked) > 0);
    if (!emps.length || !startingDrawer || !closingDrawer) return null;
    return {
      entryDate,
      startingDrawer: Number(startingDrawer),
      closingDrawer: Number(closingDrawer),
      cashSales: Number(cashSales || 0),
      electronicTips: Number(electronicTips || 0),
      employees: emps.map((r) => ({
        employeeId: r.employeeId,
        roleOnDay: r.roleOnDay,
        hoursWorked: Number(r.hoursWorked),
        shiftIds: r.shiftIds,
      })),
    };
  }, [entryDate, startingDrawer, closingDrawer, cashSales, electronicTips, rows]);

  const handlePreview = () => {
    const input = buildInput();
    if (input) preview.mutate(input);
  };

  const handleSubmit = async () => {
    const input = buildInput();
    if (!input) return;
    try {
      const result: any = await createEntry.mutateAsync(input);
      navigate(`/tips/${result.id}`);
    } catch (e: any) { setError(e.message); }
  };

  const usedIds = new Set(rows.map((r) => r.employeeId));
  const availableEmployees = employees.filter((e) => !usedIds.has(e.id));

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>New Tip Entry</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Date + Drawer */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }} useFlexGap>
          <TextField label="Date" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Starting Drawer" type="number" value={startingDrawer} onChange={(e) => setStartingDrawer(e.target.value)} slotProps={{ htmlInput: { min: 0 } }} />
          <TextField label="Closing Drawer" type="number" value={closingDrawer} onChange={(e) => setClosingDrawer(e.target.value)} slotProps={{ htmlInput: { min: 0 } }} />
          <TextField label="Cash Sales" type="number" value={cashSales} onChange={(e) => setCashSales(e.target.value)} slotProps={{ htmlInput: { min: 0 } }} />
          <TextField label="Electronic Tips" type="number" value={electronicTips} onChange={(e) => setElectronicTips(e.target.value)} slotProps={{ htmlInput: { min: 0 } }} />
        </Stack>
        <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
          <Chip label={`Cash Tips: $${cashTips.toFixed(2)}`} color="info" />
          <Chip label={`Total Pool: $${totalPool.toFixed(2)}`} color="primary" />
        </Stack>
      </Paper>

      {/* Employee Rows */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">Employees</Typography>
          <Button startIcon={<AddIcon />} onClick={addRow} disabled={availableEmployees.length === 0}>Add Employee</Button>
        </Box>
        {rows.map((row, i) => (
          <Stack key={i} direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
            <TextField select label="Employee" value={row.employeeId} onChange={(e) => updateRow(i, 'employeeId', e.target.value)} sx={{ minWidth: 180 }}>
              {employees.filter((e) => e.id === row.employeeId || !usedIds.has(e.id) || e.id === row.employeeId).map((e) => (
                <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Role" value={row.roleOnDay} onChange={(e) => updateRow(i, 'roleOnDay', e.target.value)} sx={{ width: 140 }}>
              <MenuItem value="SERVER">Server</MenuItem>
              <MenuItem value="BUSSER">Busser</MenuItem>
              <MenuItem value="EXPEDITOR">Expeditor</MenuItem>
            </TextField>
            <Autocomplete
              multiple size="small" sx={{ minWidth: 200 }}
              options={shifts} getOptionLabel={(o: Shift) => o.name}
              value={shifts.filter((s) => row.shiftIds.includes(s.id))}
              onChange={(_, val) => updateRow(i, 'shiftIds', val.map((v) => v.id))}
              renderInput={(params) => <TextField {...params} label="Shifts" />}
              renderOption={(props, option, { selected }) => (
                <li {...props} key={option.id}><Checkbox checked={selected} size="small" sx={{ mr: 1 }} />{option.name}</li>
              )}
              disableCloseOnSelect
            />
            <TextField label="Hours" type="number" value={row.hoursWorked} onChange={(e) => updateRow(i, 'hoursWorked', e.target.value)} slotProps={{ htmlInput: { min: 0.5, max: 16, step: 0.5 } }} sx={{ width: 100 }} />
            <IconButton onClick={() => removeRow(i)}><DeleteIcon /></IconButton>
          </Stack>
        ))}
        {rows.length === 0 && <Typography color="text.secondary">Add employees to calculate tips</Typography>}
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
            <PreviewTable results={preview.data.results} />
          </Paper>
        )}
      </Box>

      <Button variant="contained" size="large" onClick={handleSubmit} disabled={createEntry.isPending || !buildInput()}>
        {createEntry.isPending ? 'Saving...' : 'Save Tip Entry'}
      </Button>
    </Box>
  );
}

function PreviewTable({ results }: { results: TipCalculationResult[] }) {
  const fmt = (n: number) => `$${n.toFixed(2)}`;
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell><TableCell>Role</TableCell><TableCell>Hours</TableCell>
            <TableCell>Base Tips</TableCell><TableCell>Given</TableCell><TableCell>Received</TableCell>
            <TableCell>Final Tips</TableCell><TableCell>Total Pay</TableCell><TableCell>Eff. Rate</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {results.map((r) => (
            <TableRow key={r.employeeId}>
              <TableCell>{r.name}</TableCell><TableCell>{r.roleOnDay}</TableCell>
              <TableCell>{r.hoursWorked}</TableCell><TableCell>{fmt(r.baseTips)}</TableCell>
              <TableCell>{fmt(r.supportTipsGiven)}</TableCell><TableCell>{fmt(r.supportTipsReceived)}</TableCell>
              <TableCell><strong>{fmt(r.finalTips)}</strong></TableCell>
              <TableCell>{fmt(r.totalPay)}</TableCell><TableCell>{fmt(r.effectiveHourlyRate)}/hr</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
