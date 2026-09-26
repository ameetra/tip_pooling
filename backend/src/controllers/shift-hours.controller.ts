import { Request, Response, NextFunction } from 'express';
import { getShiftHoursConfig, setShiftHoursDefaults } from '../services/tenant.service';

export const shiftHoursController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await getShiftHoursConfig(req.tenantId);
      res.json({ success: true, data: config });
    } catch (err) { next(err); }
  },

  async setDefaults(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await setShiftHoursDefaults(req.tenantId, req.body);
      res.json({ success: true, data: config });
    } catch (err) { next(err); }
  },
};
