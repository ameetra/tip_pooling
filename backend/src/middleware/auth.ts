import { Request, Response, NextFunction } from 'express';
import { verifyJwtToken } from '../services/auth.service';
import { getTenantBySlug } from '../services/tenant.service';

// Auth bypass exists only for the local test runner. It is hard-disabled inside Lambda
// (AWS runtime always sets AWS_LAMBDA_FUNCTION_NAME), so a stray NODE_ENV=test in a
// deployed environment can NEVER disable authentication or RBAC.
const TEST_BYPASS = process.env.NODE_ENV === 'test' && !process.env.AWS_LAMBDA_FUNCTION_NAME;

// Slugs never change, so a venue's tenant id can be cached for the life of the Lambda instance.
const venueIds = new Map<string, string>();
async function tenantIdForVenue(slug: string): Promise<string | undefined> {
  if (!venueIds.has(slug)) {
    const t = await getTenantBySlug(slug);
    if (t) venueIds.set(slug, t.id);
  }
  return venueIds.get(slug);
}

export async function verifyJWT(req: Request, res: Response, next: NextFunction) {
  // In test mode, populate a stand-in user so role-dependent logic is exercisable.
  // Defaults to ADMIN; tests can override with an x-test-role header.
  if (TEST_BYPASS) {
    const role = (req.headers['x-test-role'] as string) || 'ADMIN';
    req.user = { sub: 'test-user', email: 'test@example.com', role, tenantId: req.tenantId } as any;
    return next();
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    return;
  }

  let payload;
  try {
    payload = verifyJwtToken(header.slice(7));
  } catch {
    res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token.' } });
    return;
  }

  // The SPA sends the venue from its URL; a token from another venue must not act under that venue's page.
  const venue = req.headers['x-venue'];
  if (typeof venue !== 'string' || (await tenantIdForVenue(venue)) !== payload.tenantId) {
    res.status(403).json({ success: false, error: { code: 'VENUE_MISMATCH', message: 'Signed in to a different venue.' } });
    return;
  }

  req.user = payload;
  req.tenantId = payload.tenantId;
  // Force password change: block every route except the change-password endpoint
  if (payload.mustChangePassword && !req.originalUrl.startsWith('/api/v1/auth/change-password')) {
    res.status(403).json({ success: false, error: { code: 'PASSWORD_CHANGE_REQUIRED', message: 'You must set a new password before continuing.' } });
    return;
  }
  next();
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
