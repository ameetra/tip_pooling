import { Request, Response, NextFunction } from 'express';
import prisma from '../database/client';
import { tipEntryService } from '../services/tip-entry.service';
import { TipEntryQuerySchema } from '../validation/tip.schema';

function performer(req: Request) {
  const u = (req as any).user;
  return u ? { userId: u.sub, email: u.email } : undefined;
}

export const tipController = {
  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await tipEntryService.preview(req.tenantId, req.body);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const force = req.query.force === 'true' && (req as any).user?.role === 'ADMIN';
      const entry = await tipEntryService.create(req.tenantId, req.body, force, performer(req));
      res.status(201).json({ success: true, data: entry });
    } catch (err) { next(err); }
  },

  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await tipEntryService.publish(req.tenantId, id, performer(req));
      if (!result) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tip entry not found' } }); return; }
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async edit(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const entry = await tipEntryService.edit(req.tenantId, id, req.body, performer(req));
      if (!entry) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tip entry not found' } }); return; }
      res.json({ success: true, data: entry });
    } catch (err) { next(err); }
  },

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const query = TipEntryQuerySchema.parse(req.query);
      const result = await tipEntryService.findAll(req.tenantId, query);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const entry = await tipEntryService.findById(req.tenantId, id);
      if (!entry) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tip entry not found' } }); return; }
      res.json({ success: true, data: entry });
    } catch (err) { next(err); }
  },

  async myHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.user!.sub;
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const sinceStr = since.toISOString().slice(0, 10);

      const calcs = await (prisma as any).tipCalculation.findMany({
        where: {
          employeeId,
          tipEntry: { tenantId: req.tenantId, isDeleted: false, entryDate: { gte: sinceStr } },
        },
        include: { tipEntry: { select: { entryDate: true } } },
        orderBy: { tipEntry: { entryDate: 'desc' } },
      });

      // Aggregate per date — an employee may have multiple role stints on the same day.
      const byDate = new Map<string, any>();
      for (const c of calcs) {
        const date = c.tipEntry.entryDate;
        const r = byDate.get(date) ?? { date, roles: [], hours: 0, hourlyPay: 0, tips: 0, totalPay: 0 };
        if (!r.roles.includes(c.roleOnDay)) r.roles.push(c.roleOnDay);
        r.hours += c.totalHours;
        r.hourlyPay += c.hourlyPay;
        r.tips += c.finalTips;
        r.totalPay += c.totalPay;
        byDate.set(date, r);
      }
      const records = [...byDate.values()].map((r) => ({
        date: r.date,
        role: r.roles.join(', '),
        hours: Number(r.hours.toFixed(2)),
        hourlyPay: Number(r.hourlyPay.toFixed(2)),
        tips: Number(r.tips.toFixed(2)),
        totalPay: Number(r.totalPay.toFixed(2)),
        effectiveHourlyRate: r.hours > 0 ? Number((r.totalPay / r.hours).toFixed(2)) : 0,
      }));

      const tenant = await (prisma as any).tenant.findUnique({ where: { id: req.tenantId }, select: { name: true } });
      res.json({ success: true, data: { restaurantName: tenant?.name ?? 'Demo Restaurant', records } });
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const deleted = await tipEntryService.softDelete(req.tenantId, id, performer(req));
      if (!deleted) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tip entry not found' } }); return; }
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
