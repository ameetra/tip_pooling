import { z } from 'zod';

const EmployeeShiftEntry = z.object({
  employeeId: z.string().min(1),
  roleOnDay: z.enum(['SERVER', 'BUSSER', 'EXPEDITOR']),
  hoursWorked: z.number().min(0.5).max(16),
  shiftIds: z.array(z.string().min(1)).min(1),
});

export const TipPreviewSchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  startingDrawer: z.number().min(0),
  closingDrawer: z.number().min(0),
  cashSales: z.number().min(0).default(0),
  electronicTips: z.number().min(0).default(0),
  employees: z.array(EmployeeShiftEntry).min(1),
}).refine(
  (d) => d.closingDrawer >= d.startingDrawer + d.cashSales,
  { message: 'Closing drawer must be >= starting drawer + cash sales', path: ['closingDrawer'] },
);

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
  startingDrawer: z.number().min(0).optional(),
  closingDrawer: z.number().min(0).optional(),
  cashSales: z.number().min(0).optional(),
  electronicTips: z.number().min(0).optional(),
  employees: z.array(EmployeeShiftEntry).min(1),
});

export const TipEntryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type TipPreviewInput = z.infer<typeof TipPreviewSchema>;
export type CreateTipEntryInput = z.infer<typeof CreateTipEntrySchema>;
export type EditTipEntryInput = z.infer<typeof EditTipEntrySchema>;
export type SupportStaffConfigInput = z.infer<typeof SupportStaffConfigSchema>;
export type TipEntryQuery = z.infer<typeof TipEntryQuerySchema>;
