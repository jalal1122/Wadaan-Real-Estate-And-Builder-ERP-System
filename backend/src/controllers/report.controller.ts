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
 * Safely parses and normalizes report start and end dates.
 * If endDate is provided without explicit time (length <= 10 or YYYY-MM-DD),
 * it sets UTC hours to 23:59:59.999Z to guarantee same-day transactions are included.
 */
export const parseReportDateFilter = (
  rawStart?: unknown,
  rawEnd?: unknown
): { startDate?: Date; endDate?: Date } => {
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (rawStart) {
    const s = String(rawStart).trim();
    if (s) {
      startDate = new Date(s);
      if (isNaN(startDate.getTime())) {
        throw new AppError('Invalid startDate parameter.', 400, 'VALIDATION_ERROR');
      }
      if (s.length <= 10) {
        startDate.setUTCHours(0, 0, 0, 0);
      }
    }
  }

  if (rawEnd) {
    const e = String(rawEnd).trim();
    if (e) {
      endDate = new Date(e);
      if (isNaN(endDate.getTime())) {
        throw new AppError('Invalid endDate parameter.', 400, 'VALIDATION_ERROR');
      }
      if (e.length <= 10) {
        endDate.setUTCHours(23, 59, 59, 999);
      }
    }
  }

  return { startDate, endDate };
};

/**
 * Controller to fetch true net income (Gross Deal Profit + Brokerage - Overhead).
 * GET /api/v1/reports/net-income?startDate=2026-07-01&endDate=2026-09-30
 */
export const getNetIncome = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = parseReportDateFilter(req.query.startDate, req.query.endDate);
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
    const { startDate, endDate } = parseReportDateFilter(req.query.startDate, req.query.endDate);
    const data = await ReportService.getTrialBalance(startDate, endDate);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch line-by-line project construction costs.
 * GET /api/v1/reports/project-ledger/:projectId?startDate=...&endDate=...
 */
export const getProjectLedger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = String(req.params.projectId);
    if (!projectId || projectId === 'undefined') {
      throw new AppError('projectId route parameter is required.', 400, 'VALIDATION_ERROR');
    }

    const { startDate, endDate } = parseReportDateFilter(req.query.startDate, req.query.endDate);
    const data = await ReportService.getProjectLedger(projectId, startDate, endDate);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch non-project office overhead expenses.
 * GET /api/v1/reports/overhead-ledger?startDate=...&endDate=...
 */
export const getOverheadLedger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = parseReportDateFilter(req.query.startDate, req.query.endDate);
    const data = await ReportService.getOverheadLedger(startDate, endDate);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch partner equity drawings.
 * GET /api/v1/reports/equity-drawings?startDate=...&endDate=...
 */
export const getEquityLedger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = parseReportDateFilter(req.query.startDate, req.query.endDate);
    const data = await ReportService.getEquityLedger(startDate, endDate);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

