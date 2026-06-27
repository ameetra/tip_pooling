import prisma from '../database/client';
import { CreateEmployeeInput, EmployeeQuery, SetRoleRatesInput, UpdateEmployeeInput } from '../validation/employee.schema';
import { auditService } from './audit.service';

const today = () => new Date().toISOString().slice(0, 10);

const withRates = {
  roleRates: { orderBy: { role: 'asc' as const } },
  rateHistory: { orderBy: [{ effectiveDate: 'desc' as const }, { createdAt: 'desc' as const }] },
};

export const employeeService = {
  async create(tenantId: string, data: CreateEmployeeInput) {
    // Build the per-role rate map: legacy single hourlyRate (primary role) + any explicit rates.
    const rateMap = new Map<string, number>();
    if (data.hourlyRate != null) rateMap.set(data.role, data.hourlyRate);
    for (const r of data.rates ?? []) rateMap.set(r.role, r.hourlyRate);
    const primaryRate = rateMap.get(data.role)!;

    const employee = await prisma.employee.create({
      data: { tenantId, name: data.name, email: data.email, role: data.role, hourlyRate: primaryRate },
    });

    const eff = today();
    for (const [role, hourlyRate] of rateMap) {
      await prisma.employeeRoleRate.create({ data: { employeeId: employee.id, role, hourlyRate } });
      await prisma.employeeRateHistory.create({ data: { employeeId: employee.id, role, hourlyRate, effectiveDate: eff } });
    }

    await auditService.log({ tenantId, entityType: 'EMPLOYEE', entityId: employee.id, action: 'CREATE', newValues: data });
    return prisma.employee.findFirst({ where: { id: employee.id, tenantId }, include: withRates });
  },

  async findAll(tenantId: string, query?: EmployeeQuery) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, isActive: true };
    if (query?.search) where.name = { contains: query.search };

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where, orderBy: { name: 'asc' }, skip, take: limit,
        include: { roleRates: { orderBy: { role: 'asc' } } },
      }),
      prisma.employee.count({ where }),
    ]);

    return { data, pagination: { page, limit, total } };
  },

  findById(tenantId: string, id: string) {
    return prisma.employee.findFirst({ where: { id, tenantId }, include: withRates });
  },

  async update(tenantId: string, id: string, data: UpdateEmployeeInput) {
    const existing = await prisma.employee.findFirst({ where: { id, tenantId } });
    const result = await prisma.employee.updateMany({ where: { id, tenantId }, data });
    if (result.count === 0) return null;
    await auditService.log({ tenantId, entityType: 'EMPLOYEE', entityId: id, action: 'UPDATE', oldValues: existing, newValues: data });
    return prisma.employee.findFirst({ where: { id, tenantId }, include: withRates });
  },

  async setRoleRates(tenantId: string, id: string, data: SetRoleRatesInput) {
    const employee = await prisma.employee.findFirst({ where: { id, tenantId } });
    if (!employee) return null;

    const eff = data.effectiveDate || today();
    for (const r of data.rates) {
      await prisma.employeeRoleRate.upsert({
        where: { employeeId_role: { employeeId: id, role: r.role } },
        update: { hourlyRate: r.hourlyRate },
        create: { employeeId: id, role: r.role, hourlyRate: r.hourlyRate },
      });
      await prisma.employeeRateHistory.create({ data: { employeeId: id, role: r.role, hourlyRate: r.hourlyRate, effectiveDate: eff } });
    }

    // Keep the legacy single rate in sync with the primary role's rate.
    const primary = data.rates.find((r) => r.role === employee.role);
    if (primary) await prisma.employee.updateMany({ where: { id, tenantId }, data: { hourlyRate: primary.hourlyRate } });

    await auditService.log({
      tenantId, entityType: 'EMPLOYEE', entityId: id, action: 'UPDATE_RATE',
      oldValues: { hourlyRate: employee.hourlyRate },
      newValues: { rates: data.rates, effectiveDate: eff },
    });
    return prisma.employee.findFirst({ where: { id, tenantId }, include: withRates });
  },

  getRateHistory(tenantId: string, id: string) {
    return prisma.employeeRateHistory.findMany({
      where: { employee: { id, tenantId } },
      orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async softDelete(tenantId: string, id: string) {
    const result = await prisma.employee.updateMany({
      where: { id, tenantId, isActive: true },
      data: { isActive: false },
    });
    if (result.count > 0) {
      await auditService.log({ tenantId, entityType: 'EMPLOYEE', entityId: id, action: 'DELETE' });
    }
    return result.count > 0;
  },
};
