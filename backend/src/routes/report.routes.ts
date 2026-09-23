import { Router } from 'express';
import {
  getExecutiveSnapshot,
  getDealMargins,
  getAgingRadar,
  getNetIncome,
  getTrialBalance,
  getProjectLedger,
  getOverheadLedger,
  getEquityLedger
} from '../controllers/report.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

// Screen 10: Executive Dashboard (Module 4)
router.use(authGuard);

router.get('/snapshot', getExecutiveSnapshot);
router.get('/deal-margins', getDealMargins);
router.get('/aging-radar', getAgingRadar);
router.get('/net-income', getNetIncome);
router.get('/trial-balance', getTrialBalance); // Screen 3: Trial Balance with date filtering
router.get('/project-ledger/:projectId', getProjectLedger);
router.get('/overhead-ledger', getOverheadLedger);
router.get('/equity-drawings', getEquityLedger);

export default router;
