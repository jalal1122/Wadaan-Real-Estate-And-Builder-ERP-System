import { Router } from 'express';
import {
  getExecutiveSnapshot,
  getDealMargins,
  getAgingRadar,
  getNetIncome
} from '../controllers/report.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

// Screen 10: Executive Dashboard (Module 4)
router.use(authGuard);

router.get('/snapshot', getExecutiveSnapshot);
router.get('/deal-margins', getDealMargins);
router.get('/aging-radar', getAgingRadar);
router.get('/net-income', getNetIncome);

export default router;
