import prisma from '../database/client';
import { CreateShiftInput, UpdateShiftInput } from '../validation/shift.schema';

export const shiftService = {
  create(tenantId: string, data: CreateShiftInput) {
    return prisma.shift.create({ data: { ...data, tenantId } });
  },

  findAll(tenantId: string) {
    return prisma.shift.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  },

  findById(tenantId: string, id: string) {
    return prisma.shift.findFirst({ where: { id, tenantId } });
  },

  update(tenantId: string, id: string, data: UpdateShiftInput) {
    return prisma.shift.updateMany({ where: { id, tenantId }, data }).then(async (result) => {
      if (result.count === 0) return null;
      return prisma.shift.findFirst({ where: { id, tenantId } });
    });
  },

  async softDelete(tenantId: string, id: string) {
    const result = await prisma.shift.updateMany({
      where: { id, tenantId, isActive: true },
      data: { isActive: false },
    });
    return result.count > 0;
  },
};
