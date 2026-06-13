import { Router, Request, Response, NextFunction } from 'express';
import { getBranding } from '../services/tenant.service';

const router = Router();

// Public, per-venue only — the login page fetches its own venue's branding by slug.
// The all-venues list is intentionally NOT public (would leak the tenant list); it
// returns as a super-admin endpoint in M15 via tenant.service.listBranding.
router.get('/:slug/branding', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branding = await getBranding(req.params.slug as string);
    if (!branding) {
      res.status(404).json({ success: false, error: { code: 'TENANT_NOT_FOUND', message: 'Unknown establishment.' } });
      return;
    }
    res.json({ success: true, data: branding });
  } catch (err) { next(err); }
});

export default router;
