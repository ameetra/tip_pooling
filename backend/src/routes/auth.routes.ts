import { Router } from 'express';
import { handleLogin, handleRequestMagicLink, handleVerifyMagicLink } from '../controllers/auth.controller';

const router = Router();

router.post('/login', handleLogin);
router.post('/magic-link', handleRequestMagicLink);
router.get('/verify', handleVerifyMagicLink);

export default router;
