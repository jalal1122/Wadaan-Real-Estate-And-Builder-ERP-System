import { Request, Response, NextFunction } from 'express';
import { AccountService } from '../services/account.service';
import { FiscalYearUtility } from '../utils/fiscal.util';
import { CreateAccountSchema, UpdateAccountSchema } from '../utils/validation.util';
import { AppError } from '../middleware/errorHandler';

/**
 * Controller to fetch Chart of Accounts with live calculated balances.
 * Optional query parameter ?fy=true filters Revenue & Expense from July 1st.
 */
export const getAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isFiscalYearOnly = req.query.fy === 'true' || req.query.fy === '1';

    let fiscalStartDate: Date | undefined;
    if (isFiscalYearOnly) {
      const boundary = FiscalYearUtility.getCurrentBoundary();
      fiscalStartDate = boundary.startDate;
    }

    const data = await AccountService.getLiveBalances(fiscalStartDate);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to create a new custom Chart of Accounts bucket.
 */
export const createAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = CreateAccountSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const account = await AccountService.createAccount(parseResult.data);

    res.status(201).json({
      success: true,
      message: `Account '${account.accountName}' (${account.accountCode}) created successfully.`,
      data: account
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update an account's name or category.
 */
export const updateAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parseResult = UpdateAccountSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const updatedAccount = await AccountService.updateAccount(id, parseResult.data);

    res.status(200).json({
      success: true,
      message: `Account '${updatedAccount.accountName}' updated successfully.`,
      data: updatedAccount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to delete or archive an account.
 */
export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const result = await AccountService.deleteAccount(id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        action: result.action
      }
    });
  } catch (error) {
    next(error);
  }
};
