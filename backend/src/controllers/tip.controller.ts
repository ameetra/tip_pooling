import { Request, Response, NextFunction } from 'express';
import prisma from '../database/client';
import { tipEntryService } from '../services/tip-entry.service';
import { TipEntryQuerySchema } from '../validation/tip.schema';

const RESTAURANT_NAME = process.env.RESTAURANT_NAME || 'Demo Restaurant';

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
      const result = await tipEntryService.publish(req.tenantId, id, RESTAURANT_NAME, performer(req));
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
        include: {
          tipEntry: { select: { entryDate: true } },
          shiftAssignments: { include: { shift: { select: { name: true } } } },
        },
        orderBy: { tipEntry: { entryDate: 'desc' } },
      });

      const data = calcs.map((c: any) => ({
        date: c.tipEntry.entryDate,
        role: c.roleOnDay,
        shifts: c.shiftAssignments.map((sa: any) => sa.shift.name),
        hours: c.totalHours,
        hourlyPay: c.hourlyPay,
        tips: c.finalTips,
        totalPay: c.totalPay,
        effectiveHourlyRate: c.effectiveHourlyRate,
      }));

      res.json({ success: true, data });
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
