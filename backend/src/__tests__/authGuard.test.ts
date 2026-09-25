import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authGuard } from '../middleware/authGuard';
import { CryptoUtility, SESSION_DURATION_MS } from '../utils/crypto.util';
import { prisma } from '../config/db';

jest.mock('../config/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    }
  }
}));

describe('authGuard Middleware (Sliding Session Window & DB Verification)', () => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      cookies: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  it('should return 401 UNAUTHORIZED when no cookie is present', async () => {
    await authGuard(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No active session found.' }
    });
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.cookie).not.toHaveBeenCalled();
  });

  it('should return 401 TOKEN_EXPIRED and clear cookie when token is invalid or malformed', async () => {
    mockReq.cookies = { token: 'invalid_malformed_token' };

    await authGuard(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.clearCookie).toHaveBeenCalledWith('token');
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Session expired. Please log in again.' }
    });
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.cookie).not.toHaveBeenCalled();
  });

  it('should return 401 UNAUTHORIZED and clear cookie when user does not exist in DB (e.g. after DB reset)', async () => {
    const validUserId = 'deleted-or-reset-user-id';
    const initialToken = CryptoUtility.generateJWT(validUserId);
    mockReq.cookies = { token: initialToken };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await authGuard(mockReq as Request, mockRes as Response, mockNext);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: validUserId } });
    expect(mockRes.clearCookie).toHaveBeenCalledWith('token');
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'User not found or session invalid.' }
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should slide session by re-issuing a refreshed token cookie on valid request and call next()', async () => {
    const validUserId = 'user-uuid-12345';
    const initialToken = CryptoUtility.generateJWT(validUserId);
    mockReq.cookies = { token: initialToken };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: validUserId,
      email: 'admin@wadaan.com.pk',
      fullName: 'Muhammad Jalal'
    });

    await authGuard(mockReq as Request, mockRes as Response, mockNext);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: validUserId } });
    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.user).toBeDefined();
    expect(mockReq.user.userId).toBe(validUserId);

    // Verify sliding window cookie reset
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'token',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        maxAge: SESSION_DURATION_MS
      })
    );

    // Verify the refreshed token is valid and carries the same userId
    const refreshedToken = (mockRes.cookie as jest.Mock).mock.calls[0][1];
    const decodedRefreshed = jwt.verify(refreshedToken, secret) as { userId: string };
    expect(decodedRefreshed.userId).toBe(validUserId);
  });
});
