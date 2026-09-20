import prisma from '../database/client';
import { PaginationQuery, SupportStaffConfigInput } from '../validation/tip.schema';
import { auditService } from './audit.service';
import { pickAsOf, toDateString, todayIn } from './effective-date';

const tenantToday = async (tenantId: string) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  return todayIn(tenant?.timezone ?? 'America/Los_Angeles');
};

export const supportConfigService = {
  // Each role's configuration in force on `date` (used by the tip calculation with the entry's date).
  async getAsOf(tenantId: string, date: string) {
    const configs = await prisma.supportStaffConfig.findMany({ where: { tenantId } });
    const roles = [...new Set(configs.map((c) => c.role))];
    return roles.flatMap((role) => {
      const inForce = pickAsOf(configs.filter((c) => c.role === role), date, (c) => toDateString(c.effectiveDate));
      return inForce ? [inForce] : [];
    });
  },

  async getCurrent(tenantId: string) {
    return this.getAsOf(tenantId, await tenantToday(tenantId));
  },

  async getHistory(tenantId: string, query?: PaginationQuery) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;
    const where = { tenantId };

    const [data, total] = await Promise.all([
      prisma.supportStaffConfig.findMany({
        where,
        orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.supportStaffConfig.count({ where }),
    ]);

    return { data, pagination: { page, limit, total } };
  },

  // Each role can carry its own effective date; the top-level date is a shared fallback.
  async setConfig(tenantId: string, data: SupportStaffConfigInput) {
    const fallbackDate = data.effectiveDate ?? (await tenantToday(tenantId));
    const created = await Promise.all(
      data.configs.map((c) =>
        prisma.supportStaffConfig.create({
          data: { tenantId, role: c.role, percentage: c.percentage, effectiveDate: new Date(c.effectiveDate ?? fallbackDate) },
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
