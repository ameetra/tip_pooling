import prisma from '../database/client';
import { SupportStaffConfigInput } from '../validation/tip.schema';

export const supportConfigService = {
  async getCurrent(tenantId: string) {
    // Get latest config per role
    const configs = await prisma.supportStaffConfig.findMany({
      where: { tenantId },
      orderBy: { effectiveDate: 'desc' },
    });
    // Dedupe by role (first occurrence = latest)
    const seen = new Set<string>();
    return configs.filter((c) => {
      if (seen.has(c.role)) return false;
      seen.add(c.role);
      return true;
    });
  },

  async setConfig(tenantId: string, data: SupportStaffConfigInput) {
    const now = new Date();
    const created = await Promise.all(
      data.configs.map((c) =>
        prisma.supportStaffConfig.create({
          data: { tenantId, role: c.role, percentage: c.percentage, effectiveDate: now },
        }),
      ),
    );
    return created;
  },
};
