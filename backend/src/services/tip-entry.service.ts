import prisma from '../database/client';
import { calculateTips, calculateCashTips, TipCalculationError } from './tip-calculation.service';
import { TipPreviewInput, CreateTipEntryInput } from '../validation/tip.schema';
import { Employee, SupportStaffConfig, TipCalculationResult } from '../types/tip-calculation.types';

async function buildCalcInput(tenantId: string, input: TipPreviewInput) {
  const cashTips = calculateCashTips(input.closingDrawer, input.startingDrawer, input.cashSales);
  const totalTipPool = cashTips + input.electronicTips;

  // Fetch employee details and shift names
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

  // Get support staff config
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

  return { totalTipPool, employees, supportStaffConfig, cashTips };
}

export const tipEntryService = {
  async preview(tenantId: string, input: TipPreviewInput) {
    const { totalTipPool, employees, supportStaffConfig, cashTips } = await buildCalcInput(tenantId, input);
    const results = calculateTips({ totalTipPool, employees, supportStaffConfig });
    return { entryDate: input.entryDate, cashTips, electronicTips: input.electronicTips, totalTipPool, results };
  },

  async create(tenantId: string, input: CreateTipEntryInput) {
    // Check for duplicate active entry on same date
    const existing = await prisma.tipEntry.findFirst({
      where: { tenantId, entryDate: input.entryDate, isDeleted: false },
    });
    if (existing) {
      throw new TipCalculationError(
        `An active tip entry already exists for ${input.entryDate}`,
        'DUPLICATE_ENTRY',
      );
    }

    const { totalTipPool, employees, supportStaffConfig, cashTips } = await buildCalcInput(tenantId, input);
    const results = calculateTips({ totalTipPool, employees, supportStaffConfig });

    // Build shift ID lookup from input
    const empShiftMap = new Map(input.employees.map((e) => [e.employeeId, e.shiftIds]));

    // Save everything in a transaction
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

      for (const result of results) {
        const calc = await tx.tipCalculation.create({
          data: {
            tipEntryId: entry.id,
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
          },
        });

        const shiftIds = empShiftMap.get(result.employeeId) || [];
        for (const shiftId of shiftIds) {
          await tx.shiftAssignment.create({
            data: { tipCalculationId: calc.id, shiftId },
          });
        }
      }

      return entry;
    });

    return { ...tipEntry, cashTips, totalTipPool, results };
  },

  findAll(tenantId: string) {
    return prisma.tipEntry.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { entryDate: 'desc' },
    });
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
    return result.count > 0;
  },
};
