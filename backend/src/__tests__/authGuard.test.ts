import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authGuard } from '../middleware/authGuard';
import { CryptoUtility, SESSION_DURATION_MS } from '../utils/crypto.util';

describe('authGuard Middleware (Sliding Session Window)', () => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      cookies: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  it('should return 401 UNAUTHORIZED when no cookie is present', () => {
    authGuard(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No active session found.' }
    });
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.cookie).not.toHaveBeenCalled();
  });

  it('should return 401 TOKEN_EXPIRED when token is invalid or malformed', () => {
    mockReq.cookies = { token: 'invalid_malformed_token' };

    authGuard(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Session expired. Please log in again.' }
    });
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.cookie).not.toHaveBeenCalled();
  });

  it('should slide session by re-issuing a refreshed token cookie on valid request and call next()', () => {
    const validUserId = 'user-uuid-12345';
    const initialToken = CryptoUtility.generateJWT(validUserId);
    mockReq.cookies = { token: initialToken };

    authGuard(mockReq as Request, mockRes as Response, mockNext);

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
