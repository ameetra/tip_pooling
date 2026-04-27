import prisma from '../database/client';
import { calculateTips, calculateCashTips, TipCalculationError } from './tip-calculation.service';
import { TipPreviewInput, CreateTipEntryInput, EditTipEntryInput, TipEntryQuery } from '../validation/tip.schema';
import { Employee, SupportStaffConfig, TipCalculationResult } from '../types/tip-calculation.types';
import { auditService } from './audit.service';
import { sendTipEmail } from './email.service';

async function buildCalcInput(tenantId: string, input: TipPreviewInput) {
  const cashTips = calculateCashTips(input.closingDrawer, input.startingDrawer, input.cashSales);
  const totalTipPool = cashTips + input.electronicTips;

  const employeeIds = input.employees.map((e) => e.employeeId);
  const dbEmployees = await prisma.employee.findMany({
    where: { id: { in: employeeIds }, tenantId },
  });

  const shiftIds = [...new Set(input.employees.flatMap((e) => e.shiftIds))];
  const dbShifts = await prisma.shift.findMany({
    where: { id: { in: shiftIds }, tenantId },
  });
  const shiftNameMap = new Map(dbShifts.map((s) => [s.id, s.name]));

  const employees: Employee[] = input.employees.map((entry) => {
    const dbEmp = dbEmployees.find((e) => e.id === entry.employeeId);
    if (!dbEmp) throw new TipCalculationError(`Employee ${entry.employeeId} not found`, 'EMPLOYEE_NOT_FOUND');
    return {
      id: dbEmp.id,
      name: dbEmp.name,
      roleOnDay: entry.roleOnDay as Employee['roleOnDay'],
      shifts: entry.shiftIds.map((sid) => shiftNameMap.get(sid) || sid),
      hoursWorked: entry.hoursWorked,
      hourlyRate: dbEmp.hourlyRate,
    };
  });

  const supportConfigs = await prisma.supportStaffConfig.findMany({
    where: { tenantId },
    orderBy: { effectiveDate: 'desc' },
  });
  const seen = new Set<string>();
  const supportStaffConfig: SupportStaffConfig[] = [];
  for (const c of supportConfigs) {
    if (seen.has(c.role)) continue;
    seen.add(c.role);
    supportStaffConfig.push({ role: c.role as SupportStaffConfig['role'], percentage: c.percentage });
  }

  const empRateMap = new Map(employees.map((e) => [e.id, e.hourlyRate]));
  const supportPctMap = new Map(supportStaffConfig.map((c) => [c.role, c.percentage]));

  return { totalTipPool, employees, supportStaffConfig, cashTips, empRateMap, supportPctMap };
}

async function saveCalculations(
  tx: any,
  entryId: string,
  results: TipCalculationResult[],
  empRateMap: Map<string, number>,
  supportPctMap: Map<string, number>,
  empShiftMap: Map<string, string[]>,
) {
  for (const result of results) {
    const supportPct = result.roleOnDay === 'SERVER' ? 0 : (supportPctMap.get(result.roleOnDay as 'BUSSER' | 'EXPEDITOR') || 0);
    const calc = await tx.tipCalculation.create({
      data: {
        tipEntryId: entryId,
        employeeId: result.employeeId,
        roleOnDay: result.roleOnDay,
        totalHours: result.hoursWorked,
        hourlyPay: result.hourlyPay,
        baseTips: result.baseTips,
        supportTipsGiven: result.supportTipsGiven,
        supportTipsReceived: result.supportTipsReceived,
        finalTips: result.finalTips,
        totalPay: result.totalPay,
        effectiveHourlyRate: result.effectiveHourlyRate,
        snapshotHourlyRate: empRateMap.get(result.employeeId) || 0,
        snapshotSupportPct: supportPct,
      },
    });

    const shiftIds = empShiftMap.get(result.employeeId) || [];
    for (const shiftId of shiftIds) {
      await tx.shiftAssignment.create({
        data: { tipCalculationId: calc.id, shiftId },
      });
    }
  }
}

export const tipEntryService = {
  async preview(tenantId: string, input: TipPreviewInput) {
    const { totalTipPool, employees, supportStaffConfig, cashTips } = await buildCalcInput(tenantId, input);
    const results = calculateTips({ totalTipPool, employees, supportStaffConfig });
    return { entryDate: input.entryDate, cashTips, electronicTips: input.electronicTips, totalTipPool, results };
  },

  async create(tenantId: string, input: CreateTipEntryInput, force = false) {
    if (!force) {
      const existing = await prisma.tipEntry.findFirst({
        where: { tenantId, entryDate: input.entryDate, isDeleted: false },
      });
      if (existing) {
        throw new TipCalculationError(
          `An active tip entry already exists for ${input.entryDate}`,
          'DUPLICATE_ENTRY',
        );
      }
    }

    const { totalTipPool, employees, supportStaffConfig, cashTips, empRateMap, supportPctMap } = await buildCalcInput(tenantId, input);
    const results = calculateTips({ totalTipPool, employees, supportStaffConfig });
    const empShiftMap = new Map(input.employees.map((e) => [e.employeeId, e.shiftIds]));

    const tipEntry = await prisma.$transaction(async (tx) => {
      const entry = await tx.tipEntry.create({
        data: {
          tenantId,
          entryDate: input.entryDate,
          startingDrawer: input.startingDrawer,
          closingDrawer: input.closingDrawer,
          cashSales: input.cashSales,
          electronicTips: input.electronicTips,
        },
      });

      await saveCalculations(tx, entry.id, results, empRateMap, supportPctMap, empShiftMap);
      return entry;
    });

    await auditService.log({ tenantId, entityType: 'TIP_ENTRY', entityId: tipEntry.id, action: 'CREATE', newValues: { entryDate: input.entryDate, totalTipPool } });
    return { ...tipEntry, cashTips, totalTipPool, results };
  },

  async publish(tenantId: string, id: string, restaurantName: string) {
    const entry = await prisma.tipEntry.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        tipCalculations: {
          include: {
            employee: { select: { name: true, email: true } },
            shiftAssignments: { include: { shift: { select: { name: true } } } },
          },
        },
      },
    });
    if (!entry) return null;
    if ((entry as any).publishedAt) throw new TipCalculationError('Entry is already published', 'ALREADY_PUBLISHED');

    await prisma.tipEntry.update({ where: { id }, data: { publishedAt: new Date() } as any });

    // Send emails — log failures but don't block the response
    const emailResults = await Promise.allSettled(
      entry.tipCalculations.map((calc) =>
        sendTipEmail({
          employeeName: calc.employee.name,
          employeeEmail: calc.employee.email,
          restaurantName,
          entryDate: entry.entryDate,
          shifts: calc.shiftAssignments.map((sa) => sa.shift.name),
          hours: calc.totalHours,
          finalTips: calc.finalTips,
          totalPay: calc.totalPay,
          effectiveHourlyRate: calc.effectiveHourlyRate,
        }),
      ),
    );

    const failed = emailResults.filter((r) => r.status === 'rejected');
    if (failed.length) console.error(`[publish] ${failed.length} email(s) failed`, failed.map((r: any) => r.reason?.message));

    await auditService.log({ tenantId, entityType: 'TIP_ENTRY', entityId: id, action: 'PUBLISH', newValues: { emailsSent: emailResults.length - failed.length } });
    return { emailsSent: emailResults.length - failed.length, emailsFailed: failed.length };
  },

  async edit(tenantId: string, id: string, input: EditTipEntryInput) {
    const existing = await prisma.tipEntry.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!existing) return null;
    if ((existing as any).publishedAt) throw new TipCalculationError('Cannot edit a published entry', 'ALREADY_PUBLISHED');

    // Merge existing values with partial updates
    const merged: CreateTipEntryInput = {
      entryDate: existing.entryDate,
      startingDrawer: input.startingDrawer ?? existing.startingDrawer,
      closingDrawer: input.closingDrawer ?? existing.closingDrawer,
      cashSales: input.cashSales ?? existing.cashSales,
      electronicTips: input.electronicTips ?? existing.electronicTips,
      employees: input.employees,
    };

    const { totalTipPool, employees, supportStaffConfig, cashTips, empRateMap, supportPctMap } = await buildCalcInput(tenantId, merged);
    const results = calculateTips({ totalTipPool, employees, supportStaffConfig });
    const empShiftMap = new Map(input.employees.map((e) => [e.employeeId, e.shiftIds]));

    const newEntry = await prisma.$transaction(async (tx) => {
      // Create new entry
      const entry = await tx.tipEntry.create({
        data: {
          tenantId,
          entryDate: existing.entryDate,
          startingDrawer: merged.startingDrawer,
          closingDrawer: merged.closingDrawer,
          cashSales: merged.cashSales,
          electronicTips: merged.electronicTips,
        },
      });

      await saveCalculations(tx, entry.id, results, empRateMap, supportPctMap, empShiftMap);

      // Soft-delete old entry and link to new one
      await tx.tipEntry.updateMany({
        where: { id: existing.id },
        data: { isDeleted: true, deletedAt: new Date(), replacedById: entry.id },
      });

      return entry;
    });

    await auditService.log({
      tenantId, entityType: 'TIP_ENTRY', entityId: newEntry.id, action: 'UPDATE',
      oldValues: { id: existing.id, entryDate: existing.entryDate },
      newValues: { id: newEntry.id, replacedOldId: existing.id },
    });
    return { ...newEntry, cashTips, totalTipPool, results };
  },

  async findAll(tenantId: string, query?: TipEntryQuery) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, isDeleted: false };
    if (query?.start_date || query?.end_date) {
      where.entryDate = {};
      if (query.start_date) where.entryDate.gte = query.start_date;
      if (query.end_date) where.entryDate.lte = query.end_date;
    }

    const [data, total] = await Promise.all([
      prisma.tipEntry.findMany({
        where,
        orderBy: { entryDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tipEntry.count({ where }),
    ]);

    return { data, pagination: { page, limit, total } };
  },

  findById(tenantId: string, id: string) {
    return prisma.tipEntry.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        tipCalculations: {
          include: {
            employee: { select: { id: true, name: true, email: true, role: true } },
            shiftAssignments: { include: { shift: { select: { id: true, name: true } } } },
          },
        },
      },
    });
  },

  async softDelete(tenantId: string, id: string) {
    const result = await prisma.tipEntry.updateMany({
      where: { id, tenantId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    if (result.count > 0) {
      await auditService.log({ tenantId, entityType: 'TIP_ENTRY', entityId: id, action: 'DELETE' });
    }
    return result.count > 0;
  },
};
