import { Router } from 'express';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount
} from '../controllers/account.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

// Screen 1: Chart of Accounts
router.get('/', authGuard, getAccounts);
router.post('/', authGuard, createAccount);
router.patch('/:id', authGuard, updateAccount);
router.delete('/:id', authGuard, deleteAccount);

export default router;
