import { Request, Response, NextFunction } from 'express';
import { shiftService } from '../services/shift.service';

export const shiftController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const shift = await shiftService.create(req.tenantId, req.body);
      res.status(201).json({ success: true, data: shift });
    } catch (err) { next(err); }
  },

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const shifts = await shiftService.findAll(req.tenantId);
      res.json({ success: true, data: shifts });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const shift = await shiftService.update(req.tenantId, id, req.body);
      if (!shift) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Shift not found' } }); return; }
      res.json({ success: true, data: shift });
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const deleted = await shiftService.softDelete(req.tenantId, id);
      if (!deleted) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Shift not found' } }); return; }
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
