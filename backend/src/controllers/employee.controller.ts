import { Request, Response, NextFunction } from 'express';
import { employeeService } from '../services/employee.service';

export const employeeController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.create(req.tenantId, req.body);
      res.status(201).json({ success: true, data: employee });
    } catch (err) { next(err); }
  },

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const employees = await employeeService.findAll(req.tenantId);
      res.json({ success: true, data: employees });
    } catch (err) { next(err); }
  },

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const employee = await employeeService.findById(req.tenantId, id);
      if (!employee) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } }); return; }
      res.json({ success: true, data: employee });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const employee = await employeeService.update(req.tenantId, id, req.body);
      if (!employee) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } }); return; }
      res.json({ success: true, data: employee });
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const deleted = await employeeService.softDelete(req.tenantId, id);
      if (!deleted) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } }); return; }
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
