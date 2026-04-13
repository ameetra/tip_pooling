import prisma from '../database/client';
import { CreateEmployeeInput, UpdateEmployeeInput } from '../validation/employee.schema';

export const employeeService = {
  create(tenantId: string, data: CreateEmployeeInput) {
    return prisma.employee.create({ data: { ...data, tenantId } });
  },

  findAll(tenantId: string) {
    return prisma.employee.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  },

  findById(tenantId: string, id: string) {
    return prisma.employee.findFirst({ where: { id, tenantId } });
  },

  update(tenantId: string, id: string, data: UpdateEmployeeInput) {
    return prisma.employee.updateMany({ where: { id, tenantId }, data }).then(async (result) => {
      if (result.count === 0) return null;
      return prisma.employee.findFirst({ where: { id, tenantId } });
    });
  },

  async softDelete(tenantId: string, id: string) {
    const result = await prisma.employee.updateMany({
      where: { id, tenantId, isActive: true },
      data: { isActive: false },
    });
    return result.count > 0;
  },
};
