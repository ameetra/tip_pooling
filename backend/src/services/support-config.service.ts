import prisma from '../database/client';
import { SupportStaffConfigInput } from '../validation/tip.schema';
import { auditService } from './audit.service';

export const supportConfigService = {
  async getCurrent(tenantId: string) {
    const configs = await prisma.supportStaffConfig.findMany({
      where: { tenantId },
      orderBy: { effectiveDate: 'desc' },
    });
    const seen = new Set<string>();
    return configs.filter((c) => {
      if (seen.has(c.role)) return false;
      seen.add(c.role);
      return true;
    });
  },

  async getHistory(tenantId: string) {
    return prisma.supportStaffConfig.findMany({
      where: { tenantId },
      orderBy: { effectiveDate: 'desc' },
    });
  },

  async setConfig(tenantId: string, data: SupportStaffConfigInput) {
    const effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : new Date();
    const created = await Promise.all(
      data.configs.map((c) =>
        prisma.supportStaffConfig.create({
          data: { tenantId, role: c.role, percentage: c.percentage, effectiveDate },
        }),
      ),
    );
    for (const c of created) {
      await auditService.log({
        tenantId, entityType: 'SUPPORT_CONFIG', entityId: c.id, action: 'CREATE',
        newValues: { role: c.role, percentage: c.percentage, effectiveDate: c.effectiveDate },
      });
    }
    return created;
  },
};
