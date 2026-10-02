import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');
const bills = z.number().int().min(0).max(10000).default(0);
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((s) => s || null);

export const CashCountBodySchema = z.object({
  bills100: bills,
  bills50: bills,
  bills20: bills,
  bills10: bills,
  bills5: bills,
  bills2: bills,
  bills1: bills,
  coins: z.number().min(0).max(10000).refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'At most 2 decimals').default(0),
  deposit: optionalText(50),
  comments: optionalText(500),
});

export const CreateCashCountSchema = CashCountBodySchema.extend({ entryDate: date });

export const CashCountQuerySchema = z.object({
  from: date.optional(),
  to: date.optional(),
  deposit: z.string().trim().min(1).max(50).optional(),
});

export type CashCountInput = z.infer<typeof CashCountBodySchema>;
export type CreateCashCountInput = z.infer<typeof CreateCashCountSchema>;
export type CashCountQuery = z.infer<typeof CashCountQuerySchema>;
