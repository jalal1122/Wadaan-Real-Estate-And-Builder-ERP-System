import { Router } from 'express';
import {
  createEntry,
  reverseEntry,
  getLedger
} from '../controllers/journal.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

// Screen 3: Chronological Ledger Statement
// Defined prior to parameterized routes to avoid routing collisions
router.get('/ledger/:accountId', authGuard, getLedger);

// Screen 2: General Journal Entries & Reversals
router.post('/', authGuard, createEntry);
router.post('/:id/reverse', authGuard, reverseEntry);

export default router;
