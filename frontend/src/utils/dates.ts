// Calendar date (YYYY-MM-DD) in the browser's local time, `daysAgo` days back.
// Not toISOString(): that is UTC, which is already "tomorrow" on an evening in the US.
export const localDate = (daysAgo = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-CA');
};

// The calendar day before a YYYY-MM-DD date.
export const dayBefore = (date: string) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA');
};
