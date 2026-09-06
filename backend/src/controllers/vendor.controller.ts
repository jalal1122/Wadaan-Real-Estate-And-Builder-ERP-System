import { Request, Response, NextFunction } from 'express';
import { VendorService } from '../services/vendor.service';
import { CreateVendorSchema } from '../utils/validation.util';
import { AppError } from '../middleware/errorHandler';

export const createVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = CreateVendorSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const vendor = await VendorService.createVendor(parseResult.data);

    res.status(201).json({
      success: true,
      data: vendor,
      message: 'Vendor created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getAllVendors = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const vendors = await VendorService.getAllVendors();

    res.status(200).json({
      success: true,
      data: vendors
    });
  } catch (error) {
    next(error);
  }
};

export const getUnpaidBills = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const result = await VendorService.getUnpaidBillsByVendor(id);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
