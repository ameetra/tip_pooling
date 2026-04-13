import { z } from 'zod';

export const CreateShiftSchema = z.object({
  name: z.string().min(1).max(50),
});

export const UpdateShiftSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});

export type CreateShiftInput = z.infer<typeof CreateShiftSchema>;
export type UpdateShiftInput = z.infer<typeof UpdateShiftSchema>;
