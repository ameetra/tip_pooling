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
  hourlyRate: z.number().positive().max(999).optional(),
  isActive: z.boolean().optional(),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
