import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  statusCode: number;
  code: string;
  metadata?: Record<string, any>;
  constructor(message: string, statusCode: number, code: string, metadata?: Record<string, any>) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.metadata = metadata;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Catch Custom Business Errors
  if (err instanceof AppError || (err && err.statusCode && err.code)) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.metadata || {})
      }
    });
  }

  // Catch Prisma Network/Offline Errors (Crucial for Electron local app)
  if (err instanceof Prisma.PrismaClientInitializationError || err.code === 'P1001') {
    return res.status(503).json({ success: false, error: { code: 'NETWORK_OFFLINE', message: 'Cloud database unreachable. Please check your internet connection.' } });
  }

  // Catch Prisma Unique Constraint Violations
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return res.status(409).json({ success: false, error: { code: 'DUPLICATE_RECORD', message: 'This record already exists.' } });
  }

  // Fallback
  console.error(err);
  return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred.' } });
};
