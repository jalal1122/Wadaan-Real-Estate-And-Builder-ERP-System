import { Router } from 'express';
import {
  getAllContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  createLoan,
  addRepayment,
  deleteLoan
} from '../controllers/personal.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

router.use(authGuard);

router.get('/contacts', getAllContacts);
router.post('/contacts', createContact);
router.get('/contacts/:id', getContactById);
router.patch('/contacts/:id', updateContact);
router.delete('/contacts/:id', deleteContact);

router.post('/contacts/:id/loans', createLoan);
router.delete('/loans/:loanId', deleteLoan);
router.post('/loans/:loanId/repayments', addRepayment);

export default router;
