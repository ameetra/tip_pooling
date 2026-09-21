import { z } from 'zod';
import { MAX_DAILY_HOURS, MIN_STINT_HOURS } from '../types/tip-calculation.types';

// One role-stint. The same employee may appear in multiple stints with different roles.
const EmployeeStintEntry = z.object({
  employeeId: z.string().min(1),
  role: z.enum(['SERVER', 'SHIFT_LEAD', 'BUSSER', 'EXPEDITOR']),
  hoursWorked: z.number().min(MIN_STINT_HOURS).max(MAX_DAILY_HOURS),
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

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'Invalid date');

export const SupportStaffConfigSchema = z.object({
  configs: z.array(
    z.object({
      role: z.enum(['BUSSER', 'EXPEDITOR']),
      percentage: z.number().min(0).max(50),
      effectiveDate: calendarDate.optional(),
    }),
  ).min(1),
  effectiveDate: calendarDate.optional(),
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

const MAX_REPORT_DAYS = 366;

export const PayrollReportQuerySchema = z.object({
  start_date: calendarDate,
  end_date: calendarDate,
})
  .refine((q) => q.start_date <= q.end_date, { message: 'Start date must be on or before end date', path: ['end_date'] })
  .refine((q) => (Date.parse(q.end_date) - Date.parse(q.start_date)) / 86_400_000 <= MAX_REPORT_DAYS, {
    message: 'Date range cannot exceed 1 year', path: ['end_date'],
  });

export type PaginationQuery = z.infer<typeof PaginationSchema>;

export type TipPreviewInput = z.infer<typeof TipPreviewSchema>;
export type CreateTipEntryInput = z.infer<typeof CreateTipEntrySchema>;
export type EditTipEntryInput = z.infer<typeof EditTipEntrySchema>;
export type SupportStaffConfigInput = z.infer<typeof SupportStaffConfigSchema>;
export type TipEntryQuery = z.infer<typeof TipEntryQuerySchema>;
