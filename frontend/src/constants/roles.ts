import type { EmployeeRole } from '../types';

export const ROLE_VALUES = ['SERVER', 'SHIFT_LEAD', 'BUSSER', 'EXPEDITOR'] as const;

// Underscore-aware title case: 'SHIFT_LEAD' -> 'Shift Lead', 'SERVER' -> 'Server'.
export const formatRole = (role: string): string =>
  role.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

export const ROLE_OPTIONS: { value: EmployeeRole; label: string }[] =
  ROLE_VALUES.map((value) => ({ value, label: formatRole(value) }));
