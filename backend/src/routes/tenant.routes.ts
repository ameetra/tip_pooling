import { Router, Request, Response, NextFunction } from 'express';
import { getBranding, listBranding } from '../services/tenant.service';

const router = Router();

// Public — used by login pages and the root venue picker (pre-auth)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await listBranding() });
  } catch (err) { next(err); }
});

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
