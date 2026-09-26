import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  createDeal,
  getDeals,
  getDealById,
  transferFile,
  getDealCoClients,
  addDealCoClient,
  updateDealCoClient,
  removeDealCoClient
} from '../controllers/deal.controller';
import {
  receivePayment,
  getWaitingRoom,
  clearCheque,
  bounceCheque,
  applyWalletAdvance
} from '../controllers/receipt.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

// Protect all Module 3 Inflow Engine routes with JWT authentication
router.use(authGuard);

// -------------------------------------------------------------
// Screen 8: Customers & Deal Hub
// -------------------------------------------------------------
router.get('/customers', getCustomers);
router.post('/customers', createCustomer);
router.get('/customers/:id', getCustomerById);
router.post('/customers/:customerId/apply-wallet', applyWalletAdvance);

router.get('/deals', getDeals);
router.post('/deals', createDeal);
router.get('/deals/:id', getDealById);
router.post('/deals/:dealId/transfer', transferFile);

// Multi-Client / Co-Clients Endpoints
router.get('/deals/:id/clients', getDealCoClients);
router.post('/deals/:id/clients', addDealCoClient);
router.patch('/deals/:id/clients/:clientId', updateDealCoClient);
router.delete('/deals/:id/clients/:clientId', removeDealCoClient);


// -------------------------------------------------------------
// Screen 9: Receipts & Cheque Waiting Room
// -------------------------------------------------------------
router.post('/receipts', receivePayment);
router.get('/receipts/waiting-room', getWaitingRoom);
router.post('/receipts/:id/clear', clearCheque);
router.post('/receipts/:id/bounce', bounceCheque);

export default router;
