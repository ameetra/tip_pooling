import prisma from '../database/client';
import { CreateShiftInput, UpdateShiftInput } from '../validation/shift.schema';
import { TipCalculationError } from './tip-calculation.service';
import { auditService } from './audit.service';

const MAX_SHIFTS = 10;

export const shiftService = {
  async create(tenantId: string, data: CreateShiftInput) {
    const count = await prisma.shift.count({ where: { tenantId, isActive: true } });
    if (count >= MAX_SHIFTS) {
      throw new TipCalculationError(`Maximum of ${MAX_SHIFTS} active shifts allowed`, 'MAX_SHIFTS_EXCEEDED');
    }
    const shift = await prisma.shift.create({ data: { ...data, tenantId } });
    await auditService.log({ tenantId, entityType: 'SHIFT', entityId: shift.id, action: 'CREATE', newValues: data });
    return shift;
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

  async update(tenantId: string, id: string, data: UpdateShiftInput) {
    const result = await prisma.shift.updateMany({ where: { id, tenantId }, data });
    if (result.count === 0) return null;
    await auditService.log({ tenantId, entityType: 'SHIFT', entityId: id, action: 'UPDATE', newValues: data });
    return prisma.shift.findFirst({ where: { id, tenantId } });
  },

  async softDelete(tenantId: string, id: string) {
    const usage = await prisma.shiftAssignment.findFirst({
      where: {
        shiftId: id,
        tipCalculation: { tipEntry: { tenantId, isDeleted: false } },
      },
    });
    if (usage) {
      throw new TipCalculationError(
        'Cannot delete shift that is referenced by active tip entries',
        'SHIFT_IN_USE',
      );
    }

    const result = await prisma.shift.updateMany({
      where: { id, tenantId, isActive: true },
      data: { isActive: false },
    });
    if (result.count > 0) {
      await auditService.log({ tenantId, entityType: 'SHIFT', entityId: id, action: 'DELETE' });
    }
    return result.count > 0;
  },
};
