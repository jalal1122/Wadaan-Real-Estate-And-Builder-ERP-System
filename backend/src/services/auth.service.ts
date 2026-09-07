import crypto from 'crypto';
import { prisma, User } from '../config/db';
import { CryptoUtility } from '../utils/crypto.util';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  /**
   * Verifies the 4-digit PIN against the Master Administrator with progressive lockout.
   */
  static async verifyCredentials(pinRaw: string): Promise<User> {
    if (!/^\d{4}$/.test(pinRaw)) {
      throw new AppError('PIN must be exactly 4 digits.', 400, 'INVALID_PIN_FORMAT');
    }

    // Single master administrator tenant lookup
    const user = await prisma.user.findFirst();
    if (!user) {
      throw new AppError('System is not initialized. Please run setup first.', 404, 'ADMIN_NOT_FOUND');
    }

    // Check Lockout
    if (user.lockoutExpiresAt && user.lockoutExpiresAt > new Date()) {
      const remainingSeconds = Math.ceil((user.lockoutExpiresAt.getTime() - Date.now()) / 1000);
      const limit = user.lockoutTier === 0 ? 5 : 4;
      throw new AppError(
        `Account locked. Try again in ${remainingSeconds} seconds.`,
        429,
        'ACCOUNT_LOCKED',
        {
          remainingSeconds,
          lockoutTier: user.lockoutTier,
          displayTier: user.lockoutTier + 1,
          failedAttempts: user.failedAttempts,
          maxAttempts: limit
        }
      );
    }

    const isValid = await CryptoUtility.compare(pinRaw, user.pinHash);

    if (!isValid) {
      // Progressive Lockout Math (crucial for 4-digit PIN security: 10,000 combinations)
      let newAttempts = user.failedAttempts + 1;
      let newTier = user.lockoutTier;
      let newLockoutDate: Date | null = null;

      const limit = newTier === 0 ? 5 : 4;
      if (newAttempts >= limit) {
        const lockDuration = 30 * Math.pow(2, newTier); // 30s, 60s, 120s, 240s...
        newLockoutDate = new Date(Date.now() + lockDuration * 1000);
        newTier += 1;
        newAttempts = 0; // Reset attempts for the next tier

        await prisma.user.update({
          where: { id: user.id },
          data: { failedAttempts: newAttempts, lockoutTier: newTier, lockoutExpiresAt: newLockoutDate }
        });

        const nextLimit = newTier === 0 ? 5 : 4; // Always 4 since newTier >= 1

        throw new AppError(
          `Account locked. Try again in ${lockDuration} seconds.`,
          429,
          'ACCOUNT_LOCKED',
          {
            remainingSeconds: lockDuration,
            lockoutTier: newTier,
            displayTier: newTier + 1,
            failedAttempts: 0,
            maxAttempts: nextLimit
          }
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: newAttempts, lockoutTier: newTier, lockoutExpiresAt: newLockoutDate }
      });

      throw new AppError(
        'Invalid PIN.',
        401,
        'INVALID_PIN',
        {
          failedAttempts: newAttempts,
          maxAttempts: limit,
          lockoutTier: newTier,
          displayTier: newTier + 1
        }
      );
    }

    // Success - Reset Lockout Counters and record login
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockoutTier: 0, lockoutExpiresAt: null, lastLogin: new Date() }
    });

    return updatedUser;
  }

  /**
   * Returns the current progressive lockout status for the master administrator.
   * Safe to call publicly: returns isLocked: false and default tier if no admin or not locked.
   */
  static async getLockoutStatus(): Promise<{
    isLocked: boolean;
    remainingSeconds: number;
    failedAttempts: number;
    maxAttempts: number;
    lockoutTier: number;
    displayTier: number;
  }> {
    const user = await prisma.user.findFirst();
    if (!user) {
      return {
        isLocked: false,
        remainingSeconds: 0,
        failedAttempts: 0,
        maxAttempts: 5,
        lockoutTier: 0,
        displayTier: 1
      };
    }

    const isLocked = Boolean(user.lockoutExpiresAt && user.lockoutExpiresAt > new Date());
    const remainingSeconds = isLocked && user.lockoutExpiresAt
      ? Math.max(0, Math.ceil((user.lockoutExpiresAt.getTime() - Date.now()) / 1000))
      : 0;

    const maxAttempts = user.lockoutTier === 0 ? 5 : 4;

    return {
      isLocked,
      remainingSeconds,
      failedAttempts: user.failedAttempts,
      maxAttempts,
      lockoutTier: user.lockoutTier,
      displayTier: user.lockoutTier + 1
    };
  }

  /**
   * Registers the single master administrator account with a 4-digit PIN.
   * Generates and returns a Master Recovery Key.
   */
  static async registerAdmin(data: {
    email: string;
    pin: string;
    fullName: string;
  }): Promise<{ user: User; masterRecoveryKey: string }> {
    if (!/^\d{4}$/.test(data.pin)) {
      throw new AppError('PIN must be exactly 4 digits.', 400, 'INVALID_PIN_FORMAT');
    }

    const existingCount = await prisma.user.count();
    if (existingCount > 0) {
      throw new AppError('An administrator account already exists. System is locked.', 403, 'ADMIN_ALREADY_EXISTS');
    }

    const pinHash = await CryptoUtility.hashPin(data.pin);
    const rawRecoveryKey = CryptoUtility.generateRecoveryKey();
    const hashedRecoveryKey = CryptoUtility.hashRecoveryKey(rawRecoveryKey);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        pinHash,
        masterRecoveryKey: hashedRecoveryKey,
        failedAttempts: 0,
        lockoutTier: 0
      }
    });

    return { user, masterRecoveryKey: rawRecoveryKey };
  }

  /**
   * Generates a 32-byte password reset token valid for 1 hour.
   * Stores SHA-256 hash in the database and returns the raw token.
   */
  static async generatePasswordResetToken(email: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: expires
      }
    });

    return rawToken;
  }

  /**
   * Validates a reset token OR Master Recovery Key and sets a new 4-digit PIN.
   */
  static async validateResetTokenAndSetPin(
    email: string,
    resetTokenOrKey: string,
    newPinRaw: string
  ): Promise<boolean> {
    if (!/^\d{4}$/.test(newPinRaw)) {
      throw new AppError('New PIN must be exactly 4 digits.', 400, 'INVALID_PIN_FORMAT');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('No account found with this email.', 400, 'ACCOUNT_NOT_FOUND');
    }

    const incomingHash = crypto.createHash('sha256').update(resetTokenOrKey.trim()).digest('hex');

    const matchesRecoveryKey =
      user.masterRecoveryKey &&
      user.masterRecoveryKey.toLowerCase() === incomingHash.toLowerCase();

    const matchesResetToken =
      user.resetPasswordToken &&
      user.resetPasswordToken.toLowerCase() === incomingHash.toLowerCase();

    if (!matchesRecoveryKey && !matchesResetToken) {
      throw new AppError('Invalid reset token or recovery key.', 400, 'INVALID_RESET_TOKEN_OR_RECOVERY_KEY');
    }

    // If matching reset token (not recovery key), check expiry
    if (!matchesRecoveryKey && matchesResetToken) {
      if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
        throw new AppError('Password reset token has expired. Request a new one.', 400, 'TOKEN_EXPIRED');
      }
    }

    const newPinHash = await CryptoUtility.hashPin(newPinRaw);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinHash: newPinHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        failedAttempts: 0,
        lockoutTier: 0,
        lockoutExpiresAt: null
      }
    });

    return true;
  }

  /**
   * Backward-compatible alias for validateResetTokenAndSetPin
   */
  static async validateResetTokenAndSetPassword(
    email: string,
    resetTokenOrKey: string,
    newPinRaw: string
  ): Promise<boolean> {
    return this.validateResetTokenAndSetPin(email, resetTokenOrKey, newPinRaw);
  }
}
