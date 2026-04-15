import { Request, Response, NextFunction } from 'express';
import { tipEntryService } from '../services/tip-entry.service';
import { TipEntryQuerySchema } from '../validation/tip.schema';

export const tipController = {
  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await tipEntryService.preview(req.tenantId, req.body);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const force = req.query.force === 'true';
      const entry = await tipEntryService.create(req.tenantId, req.body, force);
      res.status(201).json({ success: true, data: entry });
    } catch (err) { next(err); }
  },

  async edit(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const entry = await tipEntryService.edit(req.tenantId, id, req.body);
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

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const deleted = await tipEntryService.softDelete(req.tenantId, id);
      if (!deleted) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tip entry not found' } }); return; }
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
