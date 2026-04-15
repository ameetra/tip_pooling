import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';

export const auditController = {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const entityType = req.query.entityType as string | undefined;
      const logs = await auditService.findAll(req.tenantId, entityType);
      res.json({ success: true, data: logs });
    } catch (err) { next(err); }
  },

  async findByEntity(req: Request, res: Response, next: NextFunction) {
    try {
      const { entityType, entityId } = req.params as { entityType: string; entityId: string };
      const logs = await auditService.findByEntity(req.tenantId, entityType, entityId);
      res.json({ success: true, data: logs });
    } catch (err) { next(err); }
  },
};
