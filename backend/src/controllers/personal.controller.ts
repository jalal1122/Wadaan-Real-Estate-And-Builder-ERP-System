import { Request, Response, NextFunction } from 'express';
import { PersonalService } from '../services/personal.service';
import {
  CreatePersonalContactSchema,
  CreatePersonalLoanSchema,
  AddPersonalRepaymentSchema
} from '../utils/validation.util';
import { AppError } from '../middleware/errorHandler';

export const getAllContacts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await PersonalService.getAllContacts();
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getContactById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const result = await PersonalService.getContactById(id);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const createContact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = CreatePersonalContactSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const contact = await PersonalService.createContact(parseResult.data);
    res.status(201).json({
      success: true,
      data: contact,
      message: 'Personal contact created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const updateContact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parseResult = CreatePersonalContactSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const contact = await PersonalService.updateContact(id, parseResult.data);
    res.status(200).json({
      success: true,
      data: contact,
      message: 'Personal contact updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteContact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await PersonalService.deleteContact(id);
    res.status(200).json({
      success: true,
      message: 'Personal contact and associated ledger records deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const createLoan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contactId = req.params.id as string;
    const parseResult = CreatePersonalLoanSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const loan = await PersonalService.createLoan(contactId, parseResult.data);
    res.status(201).json({
      success: true,
      data: loan,
      message: 'Loan entry recorded successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const addRepayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loanId = req.params.loanId as string;
    const parseResult = AddPersonalRepaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const result = await PersonalService.addRepayment(loanId, parseResult.data);
    res.status(201).json({
      success: true,
      data: result,
      message: 'Repayment applied successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLoan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loanId = req.params.loanId as string;
    await PersonalService.deleteLoan(loanId);
    res.status(200).json({
      success: true,
      message: 'Loan entry and repayment history deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
