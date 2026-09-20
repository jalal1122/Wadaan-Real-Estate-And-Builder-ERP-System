import { Router } from 'express';
import { getDocumentArchive } from '../controllers/document.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

router.use(authGuard);

// Document Archive & Receipts
router.get('/archive', getDocumentArchive);

export default router;
