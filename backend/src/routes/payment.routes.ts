import { Router } from 'express';
import {
  processPaymentRun,
  getAllPayments,
  getPaymentById
} from '../controllers/payment.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

router.use(authGuard);

// Screen 7: Payment Run (supports both /vendor subroute and direct root)
router.post('/vendor', processPaymentRun);
router.post('/', processPaymentRun);
router.get('/vendor', getAllPayments);
router.get('/', getAllPayments);
router.get('/vendor/:id', getPaymentById);
router.get('/:id', getPaymentById);

export default router;
