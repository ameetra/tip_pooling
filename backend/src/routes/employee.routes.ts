import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller';
import { validateBody } from '../middleware/validate';
import { CreateEmployeeSchema, UpdateEmployeeSchema } from '../validation/employee.schema';

const router = Router();

router.post('/', validateBody(CreateEmployeeSchema), employeeController.create);
router.get('/', employeeController.findAll);
router.get('/:id', employeeController.findById);
router.patch('/:id', validateBody(UpdateEmployeeSchema), employeeController.update);
router.delete('/:id', employeeController.remove);

export default router;
