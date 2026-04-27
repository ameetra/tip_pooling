import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../database/client';

export const userController = {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await (prisma as any).user.findMany({
        where: { tenantId: req.tenantId, role: 'MANAGER', isActive: true },
        select: { id: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
      res.json({ success: true, data: users });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await (prisma as any).user.create({
        data: { tenantId: req.tenantId, email, passwordHash, role: 'MANAGER' },
        select: { id: true, email: true, role: true, createdAt: true },
      });
      res.status(201).json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const existing = await (prisma as any).user.findFirst({
        where: { id, tenantId: req.tenantId, role: 'MANAGER' },
      });
      if (!existing) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Manager not found' } });
        return;
      }
      await (prisma as any).user.update({
        where: { id },
        data: { isActive: false },
      });
      res.status(204).send();
    } catch (err) { next(err); }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { password } = req.body;
      const existing = await (prisma as any).user.findFirst({
        where: { id, tenantId: req.tenantId, role: 'MANAGER' },
      });
      if (!existing) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Manager not found' } });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      await (prisma as any).user.update({ where: { id }, data: { passwordHash } });
      res.json({ success: true });
    } catch (err) { next(err); }
  },
};
