import type { EmployeeRole } from '../types';
import { useTenant } from '../context/TenantContext';

export const ROLE_VALUES = ['SERVER', 'SHIFT_LEAD', 'BUSSER', 'EXPEDITOR'] as const;

// Login roles that may see management-only pages (e.g. Payroll). Shift leads and employees may not.
export const MANAGEMENT_ROLES = ['ADMIN', 'MANAGER'];
// Baristas get exactly the shift lead's access for now (mirrors backend SHIFT_LEAD_ROLES); to give them
// different access later, stop using isShiftLead at that one check.
export const SHIFT_LEAD_ROLES = ['SHIFT_LEAD', 'BARISTA'];
// Everyone who signs in with email + password. Employees (magic-link login) are anyone else.
export const STAFF_ROLES = [...MANAGEMENT_ROLES, ...SHIFT_LEAD_ROLES];

export const isManagement = (role?: string) => MANAGEMENT_ROLES.includes(role ?? '');
export const isStaff = (role?: string) => STAFF_ROLES.includes(role ?? '');
export const isShiftLead = (role?: string) => SHIFT_LEAD_ROLES.includes(role ?? '');

// Venue label if set (e.g. a coffee shop's SERVER is 'Barista'), else underscore-aware title case:
// 'SHIFT_LEAD' -> 'Shift Lead'. Display only — role codes and tip math are unchanged.
export const formatRole = (role: string, labels?: Record<string, string>): string =>
  labels?.[role] ?? role.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

// Role names as this venue shows them.
export function useRoleLabels() {
  const { roleLabels } = useTenant();
  return {
    formatRole: (role: string) => formatRole(role, roleLabels),
    roleOptions: ROLE_VALUES.map((value): { value: EmployeeRole; label: string } => ({ value, label: formatRole(value, roleLabels) })),
  };
}
