import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../database/client';

const forbidden = (res: Response) =>
  res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions.' } });

// Which target roles a caller can list / create / remove / reset
function allowedTargetRoles(callerRole: string | undefined): string[] {
  if (callerRole === 'ADMIN') return ['MANAGER', 'SHIFT_LEAD'];
  if (callerRole === 'MANAGER') return ['SHIFT_LEAD'];
  return [];
}

export const userController = {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = allowedTargetRoles(req.user?.role);
      const users = await (prisma as any).user.findMany({
        where: { tenantId: req.tenantId, role: { in: roles }, isActive: true },
        select: { id: true, email: true, role: true, createdAt: true },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      });
      res.json({ success: true, data: users });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, role } = req.body as { email: string; password: string; role: string };
      if (!allowedTargetRoles(req.user?.role).includes(role)) return forbidden(res);

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await (prisma as any).user.create({
        data: { tenantId: req.tenantId, email, passwordHash, role },
        select: { id: true, email: true, role: true, createdAt: true },
      });
      res.status(201).json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const allowed = allowedTargetRoles(req.user?.role);
      const target = await (prisma as any).user.findFirst({
        where: { id, tenantId: req.tenantId, role: { in: allowed } },
      });
      if (!target) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Staff member not found' } });
        return;
      }
      await (prisma as any).user.update({ where: { id }, data: { isActive: false } });
      res.status(204).send();
    } catch (err) { next(err); }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { password } = req.body;
      const allowed = allowedTargetRoles(req.user?.role);
      const target = await (prisma as any).user.findFirst({
        where: { id, tenantId: req.tenantId, role: { in: allowed } },
      });
      if (!target) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Staff member not found' } });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      await (prisma as any).user.update({ where: { id }, data: { passwordHash } });
      res.json({ success: true });
    } catch (err) { next(err); }
  },
};
