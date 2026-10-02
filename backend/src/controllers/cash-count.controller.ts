import { Request, Response, NextFunction } from 'express';
import { cashCountService } from '../services/cash-count.service';
import { CashCountQuerySchema } from '../validation/cash-count.schema';
import { performer } from '../middleware/auth';

const notFound = (res: Response) =>
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cash count not found' } });

export const cashCountController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await cashCountService.list(req.tenantId, CashCountQuerySchema.parse(req.query)) });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ success: true, data: await cashCountService.create(req.tenantId, req.body, performer(req)) });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await cashCountService.update(req.tenantId, req.params.id as string, req.body, performer(req));
      if (!updated) { notFound(res); return; }
      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      if (!(await cashCountService.remove(req.tenantId, req.params.id as string, performer(req)))) { notFound(res); return; }
      res.json({ success: true, data: { deleted: true } });
    } catch (err) { next(err); }
  },
};
