// Transforms a Square POS "team members" CSV export into an importEmployees Lambda payload.
// Usage: npx tsx scripts/import-from-square.ts --csv <path> --map <role-map.json> [--exclude a@x.com,b@y.com]
import fs from 'fs';

interface Row { [key: string]: string }
interface RateOut { role: string; hourlyRate: number }
interface EmployeeOut { name: string; email: string; rates: RateOut[] }

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1];
  }
  return out;
}

// Minimal RFC4180 CSV parser (handles quoted fields with embedded commas).
function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let field = '', row: string[] = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  const header = rows[0];
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

// "USD 7.50 Hourly" -> 7.5; skips non-hourly wage types (Annually, None, etc).
function parseHourlyWage(wage: string): number | null {
  const parts = wage.trim().split(/\s+/);
  if (parts.length < 3 || parts[2] !== 'Hourly') return null;
  const n = Number(parts[1]);
  return Number.isFinite(n) ? n : null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.csv || !args.map) {
    console.error('Usage: import-from-square.ts --csv <path> --map <role-map.json> [--exclude a@x.com,b@y.com]');
    process.exit(1);
  }

  const roleMap: Record<string, string> = JSON.parse(fs.readFileSync(args.map, 'utf-8'));
  const exclude = new Set((args.exclude ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
  const csvText = fs.readFileSync(args.csv, 'utf-8').replace(/^﻿/, '');
  const rows = parseCsv(csvText);

  const people = new Map<string, { name: string; rates: Map<string, number> }>();
  const conflicts: string[] = [];

  for (const row of rows) {
    if (row['Status'] !== 'Active') continue;
    const email = row['Email'].trim().toLowerCase();
    if (!email || exclude.has(email)) continue;
    const role = roleMap[row['Job'].trim()];
    if (!role) continue;
    const rate = parseHourlyWage(row['Wage']);
    if (rate === null) continue;

    const name = `${row['First Name'].trim()} ${row['Last Name'].trim()}`.trim();
    if (!people.has(email)) people.set(email, { name, rates: new Map() });
    const person = people.get(email)!;

    const prior = person.rates.get(role);
    if (prior != null && prior !== rate) {
      conflicts.push(`${name} <${email}>: ${role} has conflicting rates ${prior} vs ${rate} (job "${row['Job']}")`);
      continue;
    }
    person.rates.set(role, rate);
  }

  if (conflicts.length) {
    console.error('Conflicting rates found — resolve before importing:');
    conflicts.forEach((c) => console.error('  ' + c));
    process.exit(1);
  }

  const employees: EmployeeOut[] = [...people.entries()]
    .filter(([, p]) => p.rates.size > 0)
    .map(([email, p]) => ({
      name: p.name,
      email,
      rates: [...p.rates.entries()].map(([role, hourlyRate]) => ({ role, hourlyRate })),
    }));

  console.log(JSON.stringify({ employees }, null, 2));
  console.error(`\n${employees.length} employees ready to import.`);
}

main();
