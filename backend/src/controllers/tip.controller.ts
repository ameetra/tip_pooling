import { Request, Response, NextFunction } from 'express';
import { tipEntryService } from '../services/tip-entry.service';

export const tipController = {
  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await tipEntryService.preview(req.tenantId, req.body);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const entry = await tipEntryService.create(req.tenantId, req.body);
      res.status(201).json({ success: true, data: entry });
    } catch (err) { next(err); }
  },

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const entries = await tipEntryService.findAll(req.tenantId);
      res.json({ success: true, data: entries });
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

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const deleted = await tipEntryService.softDelete(req.tenantId, id);
      if (!deleted) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tip entry not found' } }); return; }
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
