import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CryptoUtility, SESSION_DURATION_MS } from '../utils/crypto.util';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authGuard = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No active session found.' } });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod') as { userId?: string };
    req.user = decoded;

    // Sliding session: Re-issue refreshed JWT cookie on every active authenticated request
    if (decoded?.userId) {
      const refreshedToken = CryptoUtility.generateJWT(decoded.userId);
      res.cookie('token', refreshedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: SESSION_DURATION_MS
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Session expired. Please log in again.' } });
  }
};
