import { Request, Response, NextFunction } from 'express';
import { FifoService } from '../services/fifo.service';
import { CreatePaymentSchema } from '../utils/validation.util';
import { AppError } from '../middleware/errorHandler';

export const processPaymentRun = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = CreatePaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const result = await FifoService.processPaymentRun(parseResult.data);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Vendor payment processed successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getAllPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vendorId } = req.query;
    const payments = await FifoService.getAllPayments(
      typeof vendorId === 'string' ? vendorId : undefined
    );

    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const payment = await FifoService.getPaymentById(id);

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};
