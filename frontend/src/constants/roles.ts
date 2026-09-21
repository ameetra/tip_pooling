import type { EmployeeRole } from '../types';

export const ROLE_VALUES = ['SERVER', 'SHIFT_LEAD', 'BUSSER', 'EXPEDITOR'] as const;

// Login roles that may see management-only pages (e.g. Payroll). Shift leads and employees may not.
export const MANAGEMENT_ROLES = ['ADMIN', 'MANAGER'];
// Everyone who signs in with email + password. Employees (magic-link login) are anyone else.
export const STAFF_ROLES = [...MANAGEMENT_ROLES, 'SHIFT_LEAD'];

export const isManagement = (role?: string) => MANAGEMENT_ROLES.includes(role ?? '');
export const isStaff = (role?: string) => STAFF_ROLES.includes(role ?? '');

// Underscore-aware title case: 'SHIFT_LEAD' -> 'Shift Lead', 'SERVER' -> 'Server'.
export const formatRole = (role: string): string =>
  role.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

export const ROLE_OPTIONS: { value: EmployeeRole; label: string }[] =
  ROLE_VALUES.map((value) => ({ value, label: formatRole(value) }));
