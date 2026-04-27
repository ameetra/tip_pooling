import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { validateBody } from '../middleware/validate';
import { CreateUserSchema, UpdatePasswordSchema } from '../validation/user.schema';

const router = Router();

router.get('/', userController.findAll);
router.post('/', validateBody(CreateUserSchema), userController.create);
router.delete('/:id', userController.remove);
router.patch('/:id/password', validateBody(UpdatePasswordSchema), userController.resetPassword);

export default router;
