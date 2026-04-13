import { Request, Response, NextFunction } from 'express';

// Hardcoded tenant context for local dev - JWT replaces this later
export function tenantContext(req: Request, _res: Response, next: NextFunction) {
  req.tenantId = process.env.DEFAULT_TENANT_ID || 'default-tenant';
  next();
}
