import { Request, Response, NextFunction } from 'express';
import { AssetStatus } from '@prisma/client';
import { WadaanAssetService } from '../services/wadaanAsset.service';
import { CreateAssetSchema, UpdateAssetSchema } from '../utils/validation.util';
import { AppError } from '../middleware/errorHandler';

export const createAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = CreateAssetSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const asset = await WadaanAssetService.createAsset(parseResult.data);

    res.status(201).json({
      success: true,
      data: asset,
      message: 'Asset registered successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getAllAssets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusQuery = req.query.status as string | undefined;
    let statusFilter: AssetStatus | undefined;
    if (statusQuery && ['AVAILABLE', 'RESERVED', 'SOLD'].includes(statusQuery.toUpperCase())) {
      statusFilter = statusQuery.toUpperCase() as AssetStatus;
    }

    const assets = await WadaanAssetService.getAllAssets(statusFilter);

    res.status(200).json({
      success: true,
      data: assets
    });
  } catch (error) {
    next(error);
  }
};

export const getAssetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const asset = await WadaanAssetService.getAssetById(id);

    res.status(200).json({
      success: true,
      data: asset
    });
  } catch (error) {
    next(error);
  }
};

export const updateAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parseResult = UpdateAssetSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const updated = await WadaanAssetService.updateAsset(id, parseResult.data);

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Asset updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const result = await WadaanAssetService.deleteAsset(id);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};
