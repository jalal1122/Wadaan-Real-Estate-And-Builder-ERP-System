import { Request, Response, NextFunction } from 'express';
import { ReceiptService } from '../services/receipt.service';
import { WalletManager } from '../utils/revenue.util';
import { prisma } from '../config/db';
import {
  CreateReceiptSchema,
  ClearChequeSchema,
  ApplyWalletSchema
} from '../utils/validation.util';
import { AppError } from '../middleware/errorHandler';

export const receivePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = CreateReceiptSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const result = await ReceiptService.logInflow(parseResult.data);
    res.status(201).json({
      success: true,
      data: result,
      message:
        result.status === 'CLEARED'
          ? 'Payment received and cleared into General Ledger'
          : 'Payment received into Cheque Waiting Room (pending clearance)'
    });
  } catch (error) {
    next(error);
  }
};

export const getWaitingRoom = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const receipts = await ReceiptService.getWaitingRoom();
    res.status(200).json({
      success: true,
      data: receipts
    });
  } catch (error) {
    next(error);
  }
};

export const clearCheque = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parseResult = ClearChequeSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const result = await ReceiptService.settlePendingCheque(id, parseResult.data.targetBankAccountId);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Cheque cleared and posted to ledger successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const bounceCheque = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const result = await ReceiptService.bounceCheque(id);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Cheque marked as bounced; invoices reverted to unpaid'
    });
  } catch (error) {
    next(error);
  }
};

export const applyWalletAdvance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.params.customerId as string;
    const parseResult = ApplyWalletSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const result = await prisma.$transaction(async (tx) => {
      return WalletManager.consumeAdvance(
        customerId,
        parseResult.data.amount,
        parseResult.data.invoiceId,
        tx
      );
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Customer wallet advance applied toward invoice successfully'
    });
  } catch (error) {
    next(error);
  }
};
