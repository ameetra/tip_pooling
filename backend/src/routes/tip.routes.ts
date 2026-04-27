import { Router } from 'express';
import { tipController } from '../controllers/tip.controller';
import { validateBody } from '../middleware/validate';
import { TipPreviewSchema, CreateTipEntrySchema, EditTipEntrySchema } from '../validation/tip.schema';

const router = Router();

router.get('/my-history', tipController.myHistory);
router.post('/preview', validateBody(TipPreviewSchema), tipController.preview);
router.post('/entries', validateBody(CreateTipEntrySchema), tipController.create);
router.get('/entries', tipController.findAll);
router.get('/entries/:id', tipController.findById);
router.post('/entries/:id/publish', tipController.publish);
router.patch('/entries/:id', validateBody(EditTipEntrySchema), tipController.edit);
router.delete('/entries/:id', tipController.remove);

export default router;
