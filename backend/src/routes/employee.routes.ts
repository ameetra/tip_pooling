import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller';
import { validateBody } from '../middleware/validate';
import { CreateEmployeeSchema, UpdateEmployeeSchema, SetRoleRatesSchema } from '../validation/employee.schema';

const router = Router();

router.post('/', validateBody(CreateEmployeeSchema), employeeController.create);
router.get('/', employeeController.findAll);
router.get('/:id', employeeController.findById);
router.patch('/:id', validateBody(UpdateEmployeeSchema), employeeController.update);
router.delete('/:id', employeeController.remove);
router.get('/:id/rate-history', employeeController.getRateHistory);
router.post('/:id/role-rates', validateBody(SetRoleRatesSchema), employeeController.setRoleRates);

export default router;
