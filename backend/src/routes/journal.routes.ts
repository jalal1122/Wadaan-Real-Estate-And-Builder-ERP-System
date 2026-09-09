import { Router } from 'express';
import {
  createEntry,
  getEntries,
  reverseEntry,
  getLedger
} from '../controllers/journal.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

// Screen 3: Chronological Ledger Statement
// Defined prior to parameterized routes to avoid routing collisions
router.get('/ledger/:accountId', authGuard, getLedger);

// Screen 2: General Journal Entries & Reversals
router.get('/', authGuard, getEntries);        // List journal entries (paginated)
router.post('/', authGuard, createEntry);       // Create new journal entry
router.post('/:id/reverse', authGuard, reverseEntry); // Reverse a journal entry

export default router;
