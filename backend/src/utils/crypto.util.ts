import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export class CryptoUtility {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async compare(raw: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(raw, hashed);
  }

  static generateRecoveryKey(): string {
    return crypto.randomBytes(8).toString('hex').toUpperCase(); // e.g., 16-char hex
  }

  static hashRecoveryKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  static generateJWT(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', {
      expiresIn: '12h'
    });
  }
}
