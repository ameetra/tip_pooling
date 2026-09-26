import { Router } from 'express';
import { shiftHoursController } from '../controllers/shift-hours.controller';
import { validateBody } from '../middleware/validate';
import { ShiftHoursDefaultsSchema } from '../validation/tip.schema';

const router = Router();

router.patch('/', validateBody(ShiftHoursDefaultsSchema), shiftHoursController.setDefaults);

export default router;
