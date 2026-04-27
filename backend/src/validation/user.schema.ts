import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export const UpdatePasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;
