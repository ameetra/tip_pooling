import { Router } from 'express';
import { supportConfigController } from '../controllers/support-config.controller';
import { validateBody } from '../middleware/validate';
import { SupportStaffConfigSchema } from '../validation/tip.schema';

const router = Router();

router.get('/', supportConfigController.getCurrent);
router.get('/history', supportConfigController.getHistory);
router.post('/', validateBody(SupportStaffConfigSchema), supportConfigController.setConfig);

export default router;
