import prisma from '../database/client';

interface AuditEntry {
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy?: { userId: string; email: string } | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
}

export const auditService = {
  log(entry: AuditEntry) {
    return prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        oldValues: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        newValues: JSON.stringify({ ...entry.newValues, ...(entry.performedBy ? { performedBy: entry.performedBy } : {}) }) || null,
      },
    });
  },

  findByEntity(tenantId: string, entityType: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { tenantId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  },

  findAll(tenantId: string, entityType?: string) {
    const where: any = { tenantId };
    if (entityType) where.entityType = entityType;
    return prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  },
};
