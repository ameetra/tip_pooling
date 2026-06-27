import prisma from '../database/client';
import { calculateTips, computeCashTips, TipCalculationError } from './tip-calculation.service';
import { TipPreviewInput, CreateTipEntryInput, EditTipEntryInput, TipEntryQuery } from '../validation/tip.schema';
import { StintInput, StintResult, SupportStaffConfig } from '../types/tip-calculation.types';
import { auditService } from './audit.service';
import { sendTipEmail } from './email.service';

async function buildCalcInput(tenantId: string, input: TipPreviewInput) {
  const cashTips = computeCashTips(input.cashInRegister, input.cashSales, input.cashTips);
  const totalTipPool = Number((cashTips + input.posTips).toFixed(2));

  const employeeIds = [...new Set(input.employees.map((e) => e.employeeId))];
  const dbEmployees = await prisma.employee.findMany({ where: { id: { in: employeeIds }, tenantId } });
  const empById = new Map(dbEmployees.map((e) => [e.id, e]));

  const roleRates = await prisma.employeeRoleRate.findMany({ where: { employeeId: { in: employeeIds } } });
  const rateByKey = new Map(roleRates.map((r) => [`${r.employeeId}:${r.role}`, r.hourlyRate]));

  const stints: StintInput[] = input.employees.map((entry) => {
    const dbEmp = empById.get(entry.employeeId);
    if (!dbEmp) throw new TipCalculationError(`Employee ${entry.employeeId} not found`, 'EMPLOYEE_NOT_FOUND');

    // Per-role rate; fall back to the legacy single rate only for the employee's primary role.
    let rate = rateByKey.get(`${entry.employeeId}:${entry.role}`);
    if (rate === undefined && entry.role === dbEmp.role) rate = dbEmp.hourlyRate;
    if (rate === undefined) {
      throw new TipCalculationError(`${dbEmp.name} has no base rate set for role ${entry.role}`, 'MISSING_ROLE_RATE');
    }

    return { employeeId: dbEmp.id, name: dbEmp.name, role: entry.role, hours: entry.hoursWorked, hourlyRate: rate };
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

  return { totalTipPool, stints, supportStaffConfig, cashTips, posTips: input.posTips };
}

async function saveCalculations(tx: any, entryId: string, stints: StintResult[]) {
  for (const s of stints) {
    await tx.tipCalculation.create({
      data: {
        tipEntryId: entryId,
        employeeId: s.employeeId,
        roleOnDay: s.role,
        totalHours: s.hours,
        hourlyPay: s.wage,
        baseTips: s.baseTips,
        supportTipsGiven: s.supportTipsGiven,
        supportTipsReceived: s.supportTipsReceived,
        finalTips: s.finalTips,
        totalPay: s.totalPay,
        effectiveHourlyRate: s.hours > 0 ? Number((s.totalPay / s.hours).toFixed(2)) : 0,
        snapshotHourlyRate: s.hourlyRate,
        snapshotSupportPct: s.supportPct,
      },
    });
  }
}

const cashColumns = (input: { cashInRegister: number; cashSales: number; cashTips: number; posTips: number }) => ({
  cashInRegister: input.cashInRegister,
  cashSales: input.cashSales,
  cashTips: input.cashTips,
  posTips: input.posTips,
});

export const tipEntryService = {
  async preview(tenantId: string, input: TipPreviewInput) {
    const { totalTipPool, stints, supportStaffConfig, cashTips, posTips } = await buildCalcInput(tenantId, input);
    const calc = calculateTips({ totalTipPool, stints, supportStaffConfig });
    return { entryDate: input.entryDate, cashTips, posTips, totalTipPool, results: calc.employees };
  },

  async create(tenantId: string, input: CreateTipEntryInput, force = false, performedBy?: { userId: string; email: string }) {
    if (!force) {
      const existing = await prisma.tipEntry.findFirst({
        where: { tenantId, entryDate: input.entryDate, isDeleted: false },
      });
      if (existing) {
        throw new TipCalculationError(`An active tip entry already exists for ${input.entryDate}`, 'DUPLICATE_ENTRY');
      }
    }

    const { totalTipPool, stints, supportStaffConfig, cashTips } = await buildCalcInput(tenantId, input);
    const calc = calculateTips({ totalTipPool, stints, supportStaffConfig });

    const tipEntry = await prisma.$transaction(async (tx) => {
      const entry = await tx.tipEntry.create({
        data: { tenantId, entryDate: input.entryDate, ...cashColumns(input) },
      });
      await saveCalculations(tx, entry.id, calc.stints);
      return entry;
    });

    await auditService.log({ tenantId, entityType: 'TIP_ENTRY', entityId: tipEntry.id, action: 'CREATE', performedBy, newValues: { entryDate: input.entryDate, totalTipPool } });
    return { ...tipEntry, cashTips, totalTipPool, results: calc.employees };
  },

  async publish(tenantId: string, id: string, performedBy?: { userId: string; email: string }) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const restaurantName = tenant?.name ?? 'Demo Restaurant';
    const slug = (tenant as any)?.slug ?? null;
    const logoUrl = (tenant as any)?.logoUrl ?? null;
    const entry = await prisma.tipEntry.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: { tipCalculations: { include: { employee: { select: { name: true, email: true } } } } },
    });
    if (!entry) return null;
    if ((entry as any).publishedAt) throw new TipCalculationError('Entry is already published', 'ALREADY_PUBLISHED');

    await prisma.tipEntry.update({ where: { id }, data: { publishedAt: new Date() } as any });

    // Aggregate per employee (an employee may have multiple role stints) → one email each.
    const byEmployee = new Map<string, { name: string; email: string; roles: string[]; hours: number; finalTips: number; totalPay: number }>();
    for (const c of entry.tipCalculations) {
      const e = byEmployee.get(c.employeeId) ?? { name: c.employee.name, email: c.employee.email, roles: [], hours: 0, finalTips: 0, totalPay: 0 };
      if (!e.roles.includes(c.roleOnDay)) e.roles.push(c.roleOnDay);
      e.hours += c.totalHours;
      e.finalTips += c.finalTips;
      e.totalPay += c.totalPay;
      byEmployee.set(c.employeeId, e);
    }
    const recipients = [...byEmployee.values()];

    const emailResults = await Promise.allSettled(
      recipients.map((r) =>
        sendTipEmail({
          employeeName: r.name,
          employeeEmail: r.email,
          restaurantName,
          slug,
          logoUrl,
          entryDate: entry.entryDate,
          roles: r.roles,
          hours: Number(r.hours.toFixed(2)),
          finalTips: Number(r.finalTips.toFixed(2)),
          totalPay: Number(r.totalPay.toFixed(2)),
          effectiveHourlyRate: r.hours > 0 ? Number((r.totalPay / r.hours).toFixed(2)) : 0,
        }),
      ),
    );

    const failed = emailResults.filter((r) => r.status === 'rejected');
    const emailDetails = recipients.map((r, i) => ({
      employeeName: r.name,
      employeeEmail: r.email,
      status: emailResults[i].status === 'fulfilled' ? 'sent' : 'failed',
      error: emailResults[i].status === 'rejected' ? (emailResults[i] as PromiseRejectedResult).reason?.message : null,
    }));

    await auditService.log({
      tenantId, entityType: 'TIP_ENTRY', entityId: id, action: 'PUBLISH',
      performedBy,
      newValues: { entryDate: entry.entryDate, emailsSent: emailResults.length - failed.length, emailsFailed: failed.length, emails: emailDetails },
    });
    return { emailsSent: emailResults.length - failed.length, emailsFailed: failed.length };
  },

  async edit(tenantId: string, id: string, input: EditTipEntryInput, performedBy?: { userId: string; email: string }) {
    const existing = await prisma.tipEntry.findFirst({ where: { id, tenantId, isDeleted: false } });
    if (!existing) return null;
    if ((existing as any).publishedAt) throw new TipCalculationError('Cannot edit a published entry', 'ALREADY_PUBLISHED');

    const merged: CreateTipEntryInput = {
      entryDate: existing.entryDate,
      cashInRegister: input.cashInRegister ?? existing.cashInRegister,
      cashSales: input.cashSales ?? existing.cashSales,
      cashTips: input.cashTips ?? existing.cashTips,
      posTips: input.posTips ?? existing.posTips,
      employees: input.employees,
    };

    const { totalTipPool, stints, supportStaffConfig, cashTips } = await buildCalcInput(tenantId, merged);
    const calc = calculateTips({ totalTipPool, stints, supportStaffConfig });

    const newEntry = await prisma.$transaction(async (tx) => {
      const entry = await tx.tipEntry.create({
        data: { tenantId, entryDate: existing.entryDate, ...cashColumns(merged) },
      });
      await saveCalculations(tx, entry.id, calc.stints);
      await tx.tipEntry.updateMany({
        where: { id: existing.id },
        data: { isDeleted: true, deletedAt: new Date(), replacedById: entry.id },
      });
      return entry;
    });

    await auditService.log({
      tenantId, entityType: 'TIP_ENTRY', entityId: newEntry.id, action: 'UPDATE',
      performedBy,
      oldValues: { id: existing.id, entryDate: existing.entryDate },
      newValues: { id: newEntry.id, replacedOldId: existing.id },
    });
    return { ...newEntry, cashTips, totalTipPool, results: calc.employees };
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
      prisma.tipEntry.findMany({ where, orderBy: { entryDate: 'desc' }, skip, take: limit }),
      prisma.tipEntry.count({ where }),
    ]);

    return { data, pagination: { page, limit, total } };
  },

  findById(tenantId: string, id: string) {
    return prisma.tipEntry.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        tipCalculations: {
          include: { employee: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
    });
  },

  async softDelete(tenantId: string, id: string, performedBy?: { userId: string; email: string }) {
    const result = await prisma.tipEntry.updateMany({
      where: { id, tenantId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    if (result.count > 0) {
      await auditService.log({ tenantId, entityType: 'TIP_ENTRY', entityId: id, action: 'DELETE', performedBy });
    }
    return result.count > 0;
  },
};
