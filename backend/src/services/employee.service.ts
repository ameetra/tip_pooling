import prisma from '../database/client';
import { CreateEmployeeInput, UpdateEmployeeInput, UpdateRateInput } from '../validation/employee.schema';
import { auditService } from './audit.service';

const today = () => new Date().toISOString().slice(0, 10);

export const employeeService = {
  async create(tenantId: string, data: CreateEmployeeInput) {
    const employee = await prisma.employee.create({ data: { ...data, tenantId } });
    await prisma.employeeRateHistory.create({
      data: { employeeId: employee.id, hourlyRate: data.hourlyRate, effectiveDate: today() },
    });
    await auditService.log({ tenantId, entityType: 'EMPLOYEE', entityId: employee.id, action: 'CREATE', newValues: data });
    return employee;
  },

  findAll(tenantId: string, search?: string) {
    const where: any = { tenantId, isActive: true };
    if (search) where.name = { contains: search };
    return prisma.employee.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { rateHistory: { orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }], take: 1 } },
    });
  },

  findById(tenantId: string, id: string) {
    return prisma.employee.findFirst({
      where: { id, tenantId },
      include: { rateHistory: { orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }] } },
    });
  },

  async update(tenantId: string, id: string, data: UpdateEmployeeInput) {
    const existing = await prisma.employee.findFirst({ where: { id, tenantId } });
    const result = await prisma.employee.updateMany({ where: { id, tenantId }, data });
    if (result.count === 0) return null;
    await auditService.log({ tenantId, entityType: 'EMPLOYEE', entityId: id, action: 'UPDATE', oldValues: existing, newValues: data });
    return prisma.employee.findFirst({
      where: { id, tenantId },
      include: { rateHistory: { orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }], take: 1 } },
    });
  },

  async updateRate(tenantId: string, id: string, data: UpdateRateInput) {
    const employee = await prisma.employee.findFirst({ where: { id, tenantId } });
    if (!employee) return null;

    const effectiveDate = data.effectiveDate || today();
    await prisma.employeeRateHistory.create({
      data: { employeeId: id, hourlyRate: data.hourlyRate, effectiveDate },
    });
    await prisma.employee.updateMany({
      where: { id, tenantId },
      data: { hourlyRate: data.hourlyRate },
    });
    await auditService.log({
      tenantId, entityType: 'EMPLOYEE', entityId: id, action: 'UPDATE_RATE',
      oldValues: { hourlyRate: employee.hourlyRate },
      newValues: { hourlyRate: data.hourlyRate, effectiveDate },
    });
    return prisma.employee.findFirst({
      where: { id, tenantId },
      include: { rateHistory: { orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }] } },
    });
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
