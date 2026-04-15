import { z } from 'zod';

export const CreateEmployeeSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  role: z.enum(['SERVER', 'BUSSER', 'EXPEDITOR']),
  hourlyRate: z.number().positive().max(999),
});

export const UpdateEmployeeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  role: z.enum(['SERVER', 'BUSSER', 'EXPEDITOR']).optional(),
  isActive: z.boolean().optional(),
});

export const UpdateRateSchema = z.object({
  hourlyRate: z.number().positive().max(999),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
export type UpdateRateInput = z.infer<typeof UpdateRateSchema>;
