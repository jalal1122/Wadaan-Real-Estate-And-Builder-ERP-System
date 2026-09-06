import { Router } from 'express';
import {
  createBill,
  getAllBills,
  getBillById
} from '../controllers/bill.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

router.use(authGuard);

// Screen 5: Expense Bills
router.post('/', createBill);
router.get('/', getAllBills);
router.get('/:id', getBillById);

export default router;
