import { Router } from 'express';
import { tipController } from '../controllers/tip.controller';
import { validateBody } from '../middleware/validate';
import { requireRole } from '../middleware/auth';
import { TipPreviewSchema, CreateTipEntrySchema, EditTipEntrySchema, DeleteTipEntrySchema } from '../validation/tip.schema';

const router = Router();

router.post('/preview', validateBody(TipPreviewSchema), tipController.preview);
router.post('/entries', validateBody(CreateTipEntrySchema), tipController.create);
router.get('/entries', tipController.findAll);
router.get('/entries/:id', tipController.findById);
router.post('/entries/:id/publish', tipController.publish);
router.patch('/entries/:id', validateBody(EditTipEntrySchema), tipController.edit);
router.delete('/entries/:id', validateBody(DeleteTipEntrySchema), tipController.remove);
router.get('/payroll-report', tipController.payrollReport);
router.get('/deleted-report', requireRole('ADMIN'), tipController.deletedReport);

export default router;
