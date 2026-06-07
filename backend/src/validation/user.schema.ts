import { z } from 'zod';

export const StaffRoleSchema = z.enum(['MANAGER', 'SHIFT_LEAD']);

export const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  role: StaffRoleSchema,
});

export const UpdatePasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

export type StaffRole = z.infer<typeof StaffRoleSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;
