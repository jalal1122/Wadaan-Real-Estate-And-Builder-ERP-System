import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { CryptoUtility, SESSION_DURATION_MS } from '../utils/crypto.util';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authGuard = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No active session found.' } });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod') as { userId?: string };

    if (!decoded?.userId) {
      res.clearCookie('token');
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid session token payload.' } });
    }

    // Verify user actually exists in the database (invalidates stale JWTs after DB reset)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      res.clearCookie('token');
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not found or session invalid.' } });
    }

    req.user = decoded;

    // Sliding session: Re-issue refreshed JWT cookie on every active authenticated request
    const refreshedToken = CryptoUtility.generateJWT(decoded.userId);
    res.cookie('token', refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_DURATION_MS
    });

    next();
  } catch (error) {
    res.clearCookie('token');
    return res.status(401).json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Session expired. Please log in again.' } });
  }
};
