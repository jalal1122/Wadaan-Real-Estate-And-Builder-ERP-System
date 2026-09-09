import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service';
import { AppError } from '../middleware/errorHandler';

/**
 * Controller to fetch the executive cash, receivables, payables, and client funds snapshot.
 * GET /api/v1/reports/snapshot
 */
export const getExecutiveSnapshot = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ReportService.calculateSnapshot();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch gross profit and margin percentages per deal/project.
 * GET /api/v1/reports/deal-margins?status=ACTIVE
 */
export const getDealMargins = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const data = await ReportService.calculateDealMargins(status);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch aging receivables and payables sorted by days overdue.
 * GET /api/v1/reports/aging-radar
 */
export const getAgingRadar = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ReportService.getAgingRadar();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch true net income (Gross Deal Profit + Brokerage - Overhead).
 * GET /api/v1/reports/net-income?startDate=2026-07-01&endDate=2026-09-30
 */
export const getNetIncome = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
    const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;

    const data = await ReportService.calculateTrueNetIncome(startDate, endDate);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch Trial Balance with date-filtered period.
 * - Permanent accounts (Asset/Liability/Equity): cumulative up to endDate.
 * - Annual accounts (Revenue/Expense): strictly between startDate and endDate.
 * GET /api/v1/reports/trial-balance?startDate=2026-07-01&endDate=2026-09-30
 */
export const getTrialBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startDate = req.query.startDate
      ? new Date(String(req.query.startDate))
      : undefined;
    const endDate = req.query.endDate
      ? new Date(String(req.query.endDate))
      : undefined;

    if (startDate && isNaN(startDate.getTime())) {
      throw new AppError('Invalid startDate parameter.', 400, 'VALIDATION_ERROR');
    }
    if (endDate && isNaN(endDate.getTime())) {
      throw new AppError('Invalid endDate parameter.', 400, 'VALIDATION_ERROR');
    }

    const data = await ReportService.getTrialBalance(startDate, endDate);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

