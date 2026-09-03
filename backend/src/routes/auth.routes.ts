import { Router } from 'express';
import {
  setupAdmin,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword
} from '../controllers/auth.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

// Public routes
router.post('/setup', setupAdmin);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes (require active JWT session)
router.post('/logout', authGuard, logout);
router.get('/me', authGuard, getMe);

export default router;
