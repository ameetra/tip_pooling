import { Request, Response, NextFunction } from 'express';
import { verifyJwtToken } from '../services/auth.service';

// Auth bypass exists only for the local test runner. It is hard-disabled inside Lambda
// (AWS runtime always sets AWS_LAMBDA_FUNCTION_NAME), so a stray NODE_ENV=test in a
// deployed environment can NEVER disable authentication or RBAC.
const TEST_BYPASS = process.env.NODE_ENV === 'test' && !process.env.AWS_LAMBDA_FUNCTION_NAME;

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  // In test mode, tenantContext already set req.tenantId from DEFAULT_TENANT_ID
  if (TEST_BYPASS) return next();

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    return;
  }

  try {
    const payload = verifyJwtToken(header.slice(7));
    req.user = payload;
    req.tenantId = payload.tenantId;
    // Force password change: block every route except the change-password endpoint
    if (payload.mustChangePassword && !req.originalUrl.startsWith('/api/v1/auth/change-password')) {
      res.status(403).json({ success: false, error: { code: 'PASSWORD_CHANGE_REQUIRED', message: 'You must set a new password before continuing.' } });
      return;
    }
    next();
  } catch {
    res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token.' } });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (TEST_BYPASS) return next();
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions.' } });
      return;
    }
    next();
  };
}
