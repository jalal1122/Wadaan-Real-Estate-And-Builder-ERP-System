import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { CryptoUtility } from '../utils/crypto.util';
import { MailUtility } from '../utils/mail.util';
import { AppError } from '../middleware/errorHandler';

/**
 * One-time setup endpoint for creating the initial Master Administrator.
 */
export const setupAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      throw new AppError('Email, password, and fullName are required.', 400, 'VALIDATION_ERROR');
    }

    const { user, masterRecoveryKey } = await AuthService.registerAdmin({
      email,
      password,
      fullName
    });

    res.status(201).json({
      success: true,
      message: 'Master Administrator created successfully.',
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        masterRecoveryKey
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login endpoint with 12-hour HttpOnly cookie session.
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required.', 400, 'VALIDATION_ERROR');
    }

    const user = await AuthService.verifyCredentials(email, password);
    const token = CryptoUtility.generateJWT(user.id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 12 * 60 * 60 * 1000 // 12 hours
    });

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout endpoint that invalidates the session cookie.
 */
export const logout = (req: Request, res: Response) => {
  res.clearCookie('token');
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};

/**
 * Returns current authenticated user context.
 */
export const getMe = (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      userId: req.user?.userId
    }
  });
};

/**
 * Triggers password reset email (protected against email enumeration attacks).
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required.', 400, 'VALIDATION_ERROR');
    }

    const rawToken = await AuthService.generatePasswordResetToken(email);

    if (rawToken) {
      await MailUtility.sendPasswordResetEmail(email, rawToken);
    }

    // Always return 200 to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'If this email address is registered, a password reset link has been dispatched.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resets password using either Email OTP token or Master Recovery Key.
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      throw new AppError(
        'Email, resetToken (or recovery key), and newPassword are required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    await AuthService.validateResetTokenAndSetPassword(email, resetToken, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You may now log in with your new credentials.'
    });
  } catch (error) {
    next(error);
  }
};
