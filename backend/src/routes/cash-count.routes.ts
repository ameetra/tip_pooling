import { Router } from 'express';
import { cashCountController } from '../controllers/cash-count.controller';
import { validateBody } from '../middleware/validate';
import { CashCountBodySchema, CreateCashCountSchema } from '../validation/cash-count.schema';

const router = Router();

router.get('/', cashCountController.list);
router.post('/', validateBody(CreateCashCountSchema), cashCountController.create);
router.put('/:id', validateBody(CashCountBodySchema), cashCountController.update);
router.delete('/:id', cashCountController.remove);

export default router;
