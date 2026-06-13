import { Router } from 'express';
import { handleLogin, handleRequestMagicLink, handleVerifyMagicLink, handleChangePassword } from '../controllers/auth.controller';
import { verifyJWT } from '../middleware/auth';

const router = Router();

router.post('/login', handleLogin);
router.post('/magic-link', handleRequestMagicLink);
router.get('/verify', handleVerifyMagicLink);
router.post('/change-password', verifyJWT, handleChangePassword);

export default router;
