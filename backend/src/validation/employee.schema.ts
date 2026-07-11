import { z } from 'zod';
import { PaginationSchema } from './tip.schema';

export const EmployeeQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
});

export type EmployeeQuery = z.infer<typeof EmployeeQuerySchema>;

const RoleRate = z.object({
  role: z.enum(['SERVER', 'SHIFT_LEAD', 'BUSSER', 'EXPEDITOR']),
  hourlyRate: z.number().positive().max(999),
});

export const CreateEmployeeSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  role: z.enum(['SERVER', 'SHIFT_LEAD', 'BUSSER', 'EXPEDITOR']),
  hourlyRate: z.number().positive().max(999).optional(),
  rates: z.array(RoleRate).optional(),
}).refine(
  (d) => d.hourlyRate != null || (d.rates ?? []).some((r) => r.role === d.role),
  { message: 'A base rate for the primary role is required', path: ['hourlyRate'] },
);

export const UpdateEmployeeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  role: z.enum(['SERVER', 'SHIFT_LEAD', 'BUSSER', 'EXPEDITOR']).optional(),
  isActive: z.boolean().optional(),
});

// Set/replace per-role base rates for an employee.
export const SetRoleRatesSchema = z.object({
  rates: z.array(RoleRate).min(1),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
export type SetRoleRatesInput = z.infer<typeof SetRoleRatesSchema>;
