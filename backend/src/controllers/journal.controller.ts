import { Request, Response, NextFunction } from 'express';
import { JournalService } from '../services/journal.service';
import { LedgerService } from '../services/ledger.service';
import { CreateJournalSchema } from '../utils/validation.util';
import { AppError } from '../middleware/errorHandler';

/**
 * Controller to retrieve a paginated list of journal entries.
 * GET /api/v1/journals?page=1&limit=20
 */
export const getEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

    if (isNaN(page) || page < 1) throw new AppError('Invalid page parameter.', 400, 'VALIDATION_ERROR');
    if (isNaN(limit) || limit < 1 || limit > 100) throw new AppError('Invalid limit parameter (1–100).', 400, 'VALIDATION_ERROR');

    const result = await JournalService.getEntries(page, limit);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Controller to create a manual double-entry journal voucher.
 */
export const createEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = CreateJournalSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const entry = await JournalService.postEntry(parseResult.data);

    res.status(201).json({
      success: true,
      message: `Journal entry '${entry.entryNumber}' posted successfully.`,
      data: entry
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to reverse an existing journal entry.
 * Generates an immutable mirror journal entry with debits and credits swapped.
 */
export const reverseEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    if (!id) {
      throw new AppError('Journal entry ID is required.', 400, 'VALIDATION_ERROR');
    }

    const reversal = await JournalService.reverseEntry(id);

    res.status(201).json({
      success: true,
      message: `Journal entry reversed successfully. Reversal voucher '${reversal.entryNumber}' posted.`,
      data: reversal
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to generate a chronological ledger statement for an account.
 * Supports query params ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD.
 */
export const getLedger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.params.accountId as string;

    if (!accountId) {
      throw new AppError('Account ID is required.', 400, 'VALIDATION_ERROR');
    }

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
      if (isNaN(startDate.getTime())) {
        throw new AppError('Invalid startDate query parameter.', 400, 'VALIDATION_ERROR');
      }
    }

    if (req.query.endDate) {
      endDate = new Date(req.query.endDate as string);
      if (isNaN(endDate.getTime())) {
        throw new AppError('Invalid endDate query parameter.', 400, 'VALIDATION_ERROR');
      }
    }

    const statement = await LedgerService.generateChronologicalLedger(
      accountId,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: statement
    });
  } catch (error) {
    next(error);
  }
};
