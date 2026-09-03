import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { CryptoUtility } from '../utils/crypto.util';
import { MailUtility } from '../utils/mail.util';
import { AppError } from '../middleware/errorHandler';

/**
 * One-time setup endpoint for creating the initial Master Administrator with a 4-digit PIN.
 */
export const setupAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, pin, fullName } = req.body;

    if (!email || !pin || !fullName) {
      throw new AppError('Email, 4-digit PIN, and fullName are required.', 400, 'VALIDATION_ERROR');
    }

    const { user, masterRecoveryKey } = await AuthService.registerAdmin({
      email,
      pin,
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
 * PIN-Only Login endpoint with 15-minute HttpOnly cookie session.
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      throw new AppError('4-digit PIN is required.', 400, 'VALIDATION_ERROR');
    }

    const user = await AuthService.verifyCredentials(pin);
    const token = CryptoUtility.generateJWT(user.id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
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
 * Triggers PIN reset email (protected against email enumeration attacks).
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
      message: 'If this email address is registered, a PIN reset link has been dispatched.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resets 4-digit PIN using either Email OTP token or Master Recovery Key.
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, resetToken, newPin, newPassword } = req.body;
    const targetPin = newPin || newPassword;

    if (!email || !resetToken || !targetPin) {
      throw new AppError(
        'Email, resetToken (or recovery key), and new 4-digit PIN are required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    await AuthService.validateResetTokenAndSetPin(email, resetToken, targetPin);

    res.status(200).json({
      success: true,
      message: 'PIN reset successfully. You may now log in with your new 4-digit PIN.'
    });
  } catch (error) {
    next(error);
  }
};
