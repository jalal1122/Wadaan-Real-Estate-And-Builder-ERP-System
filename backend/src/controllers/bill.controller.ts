import { Request, Response, NextFunction } from 'express';
import { PaymentStatus } from '@prisma/client';
import { BillService } from '../services/bill.service';
import { CreateBillSchema } from '../utils/validation.util';
import { AppError } from '../middleware/errorHandler';

export const createBill = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = CreateBillSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const result = await BillService.createBill(parseResult.data);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Expense bill created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBills = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vendorId, projectId, paymentStatus } = req.query;

    const bills = await BillService.getAllBills({
      vendorId: typeof vendorId === 'string' ? vendorId : undefined,
      projectId: typeof projectId === 'string' ? projectId : undefined,
      paymentStatus:
        typeof paymentStatus === 'string' &&
        Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)
          ? (paymentStatus as PaymentStatus)
          : undefined
    });

    res.status(200).json({
      success: true,
      data: bills
    });
  } catch (error) {
    next(error);
  }
};

export const getBillById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const bill = await BillService.getBillById(id);

    res.status(200).json({
      success: true,
      data: bill
    });
  } catch (error) {
    next(error);
  }
};
