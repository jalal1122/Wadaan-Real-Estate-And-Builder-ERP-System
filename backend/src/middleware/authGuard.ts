import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, User } from '../config/db';
import { CryptoUtility, SESSION_DURATION_MS } from '../utils/crypto.util';
import { getCache, setCache } from '../utils/cache.util';

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

    // Fast in-memory single-tenant master administrator lookup (< 0.01ms vs 600ms DB)
    let user = getCache<User>('auth:master_admin');
    if (!user || user.id !== decoded.userId) {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
      if (user) {
        setCache('auth:master_admin', user, 10 * 60 * 1000);
      }
    }

    if (!user) {
      res.clearCookie('token');
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not found or session invalid.' } });
    }

    req.user = decoded;

    const refreshedToken = CryptoUtility.generateJWT(decoded.userId);
    const isSecure = Boolean(req.secure || process.env.COOKIE_SECURE === 'true');
    res.cookie('token', refreshedToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'strict',
      maxAge: SESSION_DURATION_MS
    });

    next();
  } catch (error) {
    res.clearCookie('token');
    return res.status(401).json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Session expired. Please log in again.' } });
  }
};
