import { Router } from 'express';
import { getAccounts, createAccount } from '../controllers/account.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

// Screen 1: Chart of Accounts
router.get('/', authGuard, getAccounts);
router.post('/', authGuard, createAccount);

export default router;
