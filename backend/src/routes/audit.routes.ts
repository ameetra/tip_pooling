import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';

const router = Router();

router.get('/', auditController.findAll);
router.get('/:entityType/:entityId', auditController.findByEntity);

export default router;
