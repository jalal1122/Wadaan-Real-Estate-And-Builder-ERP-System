import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/document.service';

export const getDocumentArchive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, type, startDate, endDate, page, pageSize } = req.query;

    const result = await DocumentService.getDocumentArchive({
      search: typeof search === 'string' ? search : undefined,
      type: typeof type === 'string' && ['ALL', 'CPV', 'DPR', 'REC'].includes(type)
        ? (type as 'ALL' | 'CPV' | 'DPR' | 'REC')
        : 'ALL',
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      page: page ? parseInt(String(page), 10) : 1,
      pageSize: pageSize ? parseInt(String(pageSize), 10) : 20,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Document archive fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};
