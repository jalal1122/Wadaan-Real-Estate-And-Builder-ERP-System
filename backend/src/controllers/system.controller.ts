import { Request, Response, NextFunction } from 'express';
import { SystemService } from '../services/system.service';
import { GoLivePayloadSchema } from '../utils/validation.util';
import { AppError } from '../middleware/errorHandler';

/**
 * Controller to check if the ERP system has completed the Go-Live initialization.
 */
export const getSystemStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await SystemService.getStatus();
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to execute the atomic Go-Live initialization.
 */
export const initializeSystem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = GoLivePayloadSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const result = await SystemService.executeGoLive(parseResult.data);

    res.status(201).json({
      success: true,
      message: 'System Go-Live initialization completed successfully.',
      masterRecoveryKey: result.masterRecoveryKey,
      goLiveDate: result.goLiveDate
    });
  } catch (error) {
    next(error);
  }
};
