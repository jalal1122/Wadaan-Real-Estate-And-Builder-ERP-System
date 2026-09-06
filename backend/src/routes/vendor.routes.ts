import { Router } from 'express';
import {
  createVendor,
  getAllVendors,
  getUnpaidBills
} from '../controllers/vendor.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

router.use(authGuard);

// Screen 5 & 7: Vendors
router.post('/', createVendor);
router.get('/', getAllVendors);
router.get('/:id/unpaid-bills', getUnpaidBills);

export default router;
