import { Router } from 'express';
import { shiftController } from '../controllers/shift.controller';
import { validateBody } from '../middleware/validate';
import { CreateShiftSchema, UpdateShiftSchema } from '../validation/shift.schema';

const router = Router();

router.post('/', validateBody(CreateShiftSchema), shiftController.create);
router.get('/', shiftController.findAll);
router.patch('/:id', validateBody(UpdateShiftSchema), shiftController.update);
router.delete('/:id', shiftController.remove);

export default router;
