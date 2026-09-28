import { Decimal } from '@prisma/client/runtime/library';
import { AssetStatus, AssetCategory } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CreateAssetInput, UpdateAssetInput } from '../utils/validation.util';
import { getCache, setCache, bustCache } from '../utils/cache.util';

export class WadaanAssetService {
  /**
   * Registers a new company-owned plot, house, commercial, or apartment asset.
   */
  static async createAsset(data: CreateAssetInput) {
    const asset = await prisma.wadaanAsset.create({
      data: {
        assetTitle: data.assetTitle,
        assetCategory: data.assetCategory as AssetCategory,
        acquisitionCost: new Decimal(data.acquisitionCost),
        acquisitionDate: new Date(data.acquisitionDate),
        description: data.description ?? null,
        status: 'AVAILABLE'
      },
      include: {
        deal: {
          include: {
            customer: {
              select: { id: true, fullName: true, phone: true }
            }
          }
        }
      }
    });

    bustCache('assets');
    bustCache('reports');
    return asset;
  }

  /**
   * Lists all owned assets with optional status filter.
   */
  static async getAllAssets(statusFilter?: AssetStatus) {
    const CACHE_KEY = `assets:${statusFilter ?? 'all'}`;
    const cached = getCache<any[]>(CACHE_KEY);
    if (cached) return cached;

    const assets = await prisma.wadaanAsset.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      include: {
        deal: {
          include: {
            customer: {
              select: { id: true, fullName: true, phone: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    setCache(CACHE_KEY, assets, 60_000);
    return assets;
  }

  /**
   * Retrieves single asset details by ID.
   */
  static async getAssetById(id: string) {
    const asset = await prisma.wadaanAsset.findUnique({
      where: { id },
      include: {
        deal: {
          include: {
            customer: true
          }
        }
      }
    });

    if (!asset) {
      throw new AppError(`Asset with ID '${id}' not found`, 404, 'ASSET_NOT_FOUND');
    }

    return asset;
  }

  /**
   * Updates asset metadata. Only AVAILABLE assets can have their cost or core details altered.
   */
  static async updateAsset(id: string, data: UpdateAssetInput) {
    const asset = await prisma.wadaanAsset.findUnique({ where: { id } });
    if (!asset) {
      throw new AppError(`Asset with ID '${id}' not found`, 404, 'ASSET_NOT_FOUND');
    }

    if (asset.status !== 'AVAILABLE') {
      throw new AppError(
        `Cannot update asset "${asset.assetTitle}" because it is currently ${asset.status}.`,
        409,
        'ASSET_NOT_AVAILABLE'
      );
    }

    const updatePayload: any = {};
    if (data.assetTitle !== undefined) updatePayload.assetTitle = data.assetTitle;
    if (data.assetCategory !== undefined) updatePayload.assetCategory = data.assetCategory as AssetCategory;
    if (data.acquisitionCost !== undefined) updatePayload.acquisitionCost = new Decimal(data.acquisitionCost);
    if (data.acquisitionDate !== undefined) updatePayload.acquisitionDate = new Date(data.acquisitionDate);
    if (data.description !== undefined) updatePayload.description = data.description;

    const updated = await prisma.wadaanAsset.update({
      where: { id },
      data: updatePayload,
      include: {
        deal: {
          include: {
            customer: {
              select: { id: true, fullName: true, phone: true }
            }
          }
        }
      }
    });

    bustCache('assets');
    bustCache('reports');
    return updated;
  }

  /**
   * Deletes an asset. Guardrail: RESERVED or SOLD assets cannot be deleted.
   */
  static async deleteAsset(id: string) {
    const asset = await prisma.wadaanAsset.findUnique({ where: { id } });
    if (!asset) {
      throw new AppError(`Asset with ID '${id}' not found`, 404, 'ASSET_NOT_FOUND');
    }

    if (asset.status !== 'AVAILABLE' || asset.dealId !== null) {
      throw new AppError(
        'Cannot delete an asset that is linked to an active deal.',
        409,
        'ASSET_LINKED_TO_DEAL'
      );
    }

    await prisma.wadaanAsset.delete({ where: { id } });

    bustCache('assets');
    bustCache('reports');
    return { success: true, message: `Asset "${asset.assetTitle}" deleted successfully.` };
  }
}
