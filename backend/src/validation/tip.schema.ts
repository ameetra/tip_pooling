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
});

export const CreateTipEntrySchema = TipPreviewSchema;

export const SupportStaffConfigSchema = z.object({
  configs: z.array(
    z.object({
      role: z.enum(['BUSSER', 'EXPEDITOR']),
      percentage: z.number().min(0).max(50),
    }),
  ).min(1),
});

export type TipPreviewInput = z.infer<typeof TipPreviewSchema>;
export type CreateTipEntryInput = z.infer<typeof CreateTipEntrySchema>;
export type SupportStaffConfigInput = z.infer<typeof SupportStaffConfigSchema>;
