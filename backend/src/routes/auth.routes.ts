import { Router } from 'express';
import { handleRequestMagicLink, handleVerifyMagicLink } from '../controllers/auth.controller';

const router = Router();

router.post('/magic-link', handleRequestMagicLink);
router.get('/verify', handleVerifyMagicLink);

export default router;
