import { z } from 'zod';

export const StaffRoleSchema = z.enum(['MANAGER', 'SHIFT_LEAD']);

// Policy for newly set passwords (create / reset / change). Login stays lenient so
// existing accounts with older passwords aren't locked out.
export const StrongPasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128)
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number');

export const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  password: StrongPasswordSchema,
  role: StaffRoleSchema,
});

export const UpdatePasswordSchema = z.object({
  password: StrongPasswordSchema,
});

export type StaffRole = z.infer<typeof StaffRoleSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;
