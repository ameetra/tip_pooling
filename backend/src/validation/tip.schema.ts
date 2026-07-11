import { z } from 'zod';

// One role-stint. The same employee may appear in multiple stints with different roles.
const EmployeeStintEntry = z.object({
  employeeId: z.string().min(1),
  role: z.enum(['SERVER', 'SHIFT_LEAD', 'BUSSER', 'EXPEDITOR']),
  hoursWorked: z.number().min(0.5).max(16),
});

// Total pool = (cashInRegister - cashSales) + cashTips + posTips. Must be >= 0.
const cashFields = {
  cashInRegister: z.number().min(0).default(0),
  cashSales: z.number().min(0).default(0),
  cashTips: z.number().min(0).default(0),
  posTips: z.number().min(0).default(0),
};
const poolNonNegative = (d: { cashInRegister: number; cashSales: number; cashTips: number; posTips: number }) =>
  (d.cashInRegister - d.cashSales) + d.cashTips + d.posTips >= 0;
const poolError = { message: 'Total tips cannot be negative', path: ['cashInRegister'] };

export const TipPreviewSchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  ...cashFields,
  employees: z.array(EmployeeStintEntry).min(1),
}).refine(poolNonNegative, poolError);

export const CreateTipEntrySchema = TipPreviewSchema;

export const SupportStaffConfigSchema = z.object({
  configs: z.array(
    z.object({
      role: z.enum(['BUSSER', 'EXPEDITOR']),
      percentage: z.number().min(0).max(50),
    }),
  ).min(1),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
});

export const EditTipEntrySchema = z.object({
  cashInRegister: z.number().min(0).optional(),
  cashSales: z.number().min(0).optional(),
  cashTips: z.number().min(0).optional(),
  posTips: z.number().min(0).optional(),
  employees: z.array(EmployeeStintEntry).min(1),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const TipEntryQuerySchema = PaginationSchema.extend({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type PaginationQuery = z.infer<typeof PaginationSchema>;

export type TipPreviewInput = z.infer<typeof TipPreviewSchema>;
export type CreateTipEntryInput = z.infer<typeof CreateTipEntrySchema>;
export type EditTipEntryInput = z.infer<typeof EditTipEntrySchema>;
export type SupportStaffConfigInput = z.infer<typeof SupportStaffConfigSchema>;
export type TipEntryQuery = z.infer<typeof TipEntryQuerySchema>;
