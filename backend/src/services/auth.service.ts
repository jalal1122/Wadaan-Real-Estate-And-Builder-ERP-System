import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { CryptoUtility } from '../utils/crypto.util';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export class AuthService {
  /**
   * Verifies user credentials with the progressive lockout engine.
   */
  static async verifyCredentials(email: string, passwordRaw: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('Invalid Email', 401, 'INVALID_EMAIL');

    // Check Lockout
    if (user.lockoutExpiresAt && user.lockoutExpiresAt > new Date()) {
      const remainingSeconds = Math.ceil((user.lockoutExpiresAt.getTime() - Date.now()) / 1000);
      throw new AppError(`Account locked. Try again in ${remainingSeconds} seconds.`, 429, 'ACCOUNT_LOCKED');
    }

    const isValid = await CryptoUtility.compare(passwordRaw, user.passwordHash);

    if (!isValid) {
      // Brute Force Math
      let newAttempts = user.failedAttempts + 1;
      let newTier = user.lockoutTier;
      let newLockoutDate: Date | null = null;

      const limit = newTier === 0 ? 5 : 4;
      if (newAttempts >= limit) {
        const lockDuration = 30 * Math.pow(2, newTier); // 30s, 60s, 120s, 240s...
        newLockoutDate = new Date(Date.now() + lockDuration * 1000);
        newTier += 1;
        newAttempts = 0; // Reset attempts for the next tier
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: newAttempts, lockoutTier: newTier, lockoutExpiresAt: newLockoutDate }
      });

      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Success - Reset Lockout Counters and record login
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockoutTier: 0, lockoutExpiresAt: null, lastLogin: new Date() }
    });

    return user;
  }

  /**
   * Registers the single master administrator account if none exists.
   * Generates and returns a Master Recovery Key.
   */
  static async registerAdmin(data: { email: string; password: string; fullName: string }) {
    const existingCount = await prisma.user.count();
    if (existingCount > 0) {
      throw new AppError('An administrator account already exists. System is locked.', 403, 'ADMIN_ALREADY_EXISTS');
    }

    const passwordHash = await CryptoUtility.hashPassword(data.password);
    const rawRecoveryKey = CryptoUtility.generateRecoveryKey();
    const hashedRecoveryKey = CryptoUtility.hashRecoveryKey(rawRecoveryKey);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        passwordHash,
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
   * Validates a password reset token OR Master Recovery Key and updates the password.
   */
  static async validateResetTokenAndSetPassword(email: string, resetTokenOrKey: string, newPasswordRaw: string) {
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
      throw new AppError('Invalid reset token or recovery key', 400, 'INVALID_RESET_TOKEN_OR_RECOVERY_KEY');
    }

    // If matching reset token (not recovery key), check expiry
    if (!matchesRecoveryKey && matchesResetToken) {
      if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
        throw new AppError('Password reset token has expired. Request a new one.', 400, 'TOKEN_EXPIRED');
      }
    }

    const newPasswordHash = await CryptoUtility.hashPassword(newPasswordRaw);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        failedAttempts: 0,
        lockoutTier: 0,
        lockoutExpiresAt: null
      }
    });

    return true;
  }
}
