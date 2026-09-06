import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service';
import { DealService } from '../services/deal.service';
import {
  CreateCustomerSchema,
  CreateDealSchema,
  TransferFileSchema
} from '../utils/validation.util';
import { AppError } from '../middleware/errorHandler';

export const getCustomers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await CustomerService.getAllCustomers();
    res.status(200).json({
      success: true,
      data: customers
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const customer = await CustomerService.getCustomerById(id);
    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = CreateCustomerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const customer = await CustomerService.createCustomer(parseResult.data);
    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const createDeal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = CreateDealSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const deal = await DealService.initializeContract(parseResult.data);
    res.status(201).json({
      success: true,
      data: deal,
      message: 'Deal contract initialized successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getDeals = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const deals = await DealService.getAllDeals();
    res.status(200).json({
      success: true,
      data: deals
    });
  } catch (error) {
    next(error);
  }
};

export const getDealById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const deal = await DealService.getDealById(id);
    res.status(200).json({
      success: true,
      data: deal
    });
  } catch (error) {
    next(error);
  }
};

export const transferFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dealId = req.params.dealId as string;
    const parseResult = TransferFileSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const result = await DealService.executeFileTransfer(dealId, parseResult.data);
    res.status(200).json({
      success: true,
      data: result,
      message: 'File transfer executed successfully'
    });
  } catch (error) {
    next(error);
  }
};
