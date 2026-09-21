import prisma from '../database/client';

const round2 = (n: number) => Number(n.toFixed(2));

interface EmployeeTotals { employeeId: string; name: string; email: string; days: Set<string>; hours: number; tips: number }

export const payrollReportService = {
  // Total tips per employee over published entries in [startDate, endDate]. Unpublished entries are
  // excluded from the totals and returned so the UI can warn about them.
  async build(tenantId: string, startDate: string, endDate: string) {
    const entries = await prisma.tipEntry.findMany({
      where: { tenantId, isDeleted: false, entryDate: { gte: startDate, lte: endDate } },
      orderBy: { entryDate: 'asc' },
      select: {
        id: true, entryDate: true, publishedAt: true,
        tipCalculations: {
          select: { employeeId: true, totalHours: true, finalTips: true, employee: { select: { name: true, email: true } } },
        },
      },
    });

    const published = entries.filter((e) => e.publishedAt);

    // An employee may have several role stints (and days); combine them into one row.
    const byEmployee = new Map<string, EmployeeTotals>();
    for (const entry of published) {
      for (const c of entry.tipCalculations) {
        const row = byEmployee.get(c.employeeId)
          ?? { employeeId: c.employeeId, name: c.employee.name, email: c.employee.email, days: new Set<string>(), hours: 0, tips: 0 };
        row.days.add(entry.entryDate);
        row.hours += c.totalHours;
        row.tips += c.finalTips;
        byEmployee.set(c.employeeId, row);
      }
    }

    const employees = [...byEmployee.values()]
      .map((r) => ({ employeeId: r.employeeId, name: r.name, email: r.email, daysWorked: r.days.size, hours: round2(r.hours), totalTips: round2(r.tips) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      startDate,
      endDate,
      publishedEntries: published.length,
      employees,
      // Sum of the rounded rows, so the footer always equals the column the manager is typing from.
      totalTips: round2(employees.reduce((sum, e) => sum + e.totalTips, 0)),
      unpublished: entries.filter((e) => !e.publishedAt).map((e) => ({ id: e.id, entryDate: e.entryDate })),
    };
  },
};
