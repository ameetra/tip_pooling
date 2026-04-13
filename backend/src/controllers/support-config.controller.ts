import { Request, Response, NextFunction } from 'express';
import { supportConfigService } from '../services/support-config.service';

export const supportConfigController = {
  async getCurrent(req: Request, res: Response, next: NextFunction) {
    try {
      const configs = await supportConfigService.getCurrent(req.tenantId);
      res.json({ success: true, data: configs });
    } catch (err) { next(err); }
  },

  async setConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const configs = await supportConfigService.setConfig(req.tenantId, req.body);
      res.status(201).json({ success: true, data: configs });
    } catch (err) { next(err); }
  },
};
