type Cell = string | number;

// Quote a cell as needed; a text cell starting with = + - @ would run as a spreadsheet formula, so defuse it.
const escapeCell = (value: Cell) => {
  const text = typeof value === 'string' && /^[=+\-@]/.test(value) ? `'${value}` : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// The BOM makes Excel read the file as UTF-8 (names with accents).
export const toCsv = (rows: Cell[][]) => '﻿' + rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');

export function downloadCsv(filename: string, rows: Cell[][]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
