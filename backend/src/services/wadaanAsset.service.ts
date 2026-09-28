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
   * Includes self-healing settlement: automatically transitions RESERVED assets to SOLD
   * if their linked deal has all invoices fully settled.
   */
  static async getAllAssets(statusFilter?: AssetStatus) {
    const CACHE_KEY = `assets:${statusFilter ?? 'all'}`;
    const cached = getCache<any[]>(CACHE_KEY);
    if (cached) return cached;

    let assets = await prisma.wadaanAsset.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      include: {
        deal: {
          include: {
            customer: {
              select: { id: true, fullName: true, phone: true }
            },
            invoices: {
              select: { paymentStatus: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Self-healing settlement reconciliation: if an asset is RESERVED but its linked deal is fully paid, update to SOLD
    let needsCacheBust = false;
    for (const asset of assets) {
      if (asset.status === 'RESERVED' && asset.deal && asset.deal.invoices && asset.deal.invoices.length > 0) {
        const isSettled = asset.deal.invoices.every((inv: any) => inv.paymentStatus === 'PAID');
        if (isSettled) {
          await prisma.wadaanAsset.update({
            where: { id: asset.id },
            data: { status: 'SOLD' }
          });
          asset.status = 'SOLD';
          needsCacheBust = true;
        }
      }
    }

    if (needsCacheBust) {
      bustCache('reports');
    }

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

  /**
   * Checks whether a deal's invoices are all PAID and automatically transitions
   * any linked RESERVED asset to SOLD.
   */
  static async checkAndMarkDealAssetSold(dealId: string, txClient?: any): Promise<boolean> {
    if (!dealId) return false;
    const db = txClient ?? prisma;

    if (!db?.deal?.findUnique || !db?.wadaanAsset?.update) {
      return false;
    }

    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: {
        asset: true,
        invoices: {
          select: { paymentStatus: true }
        }
      }
    });

    if (!deal || !deal.asset || deal.asset.status !== 'RESERVED') {
      return false;
    }

    const allInvoicesPaid =
      deal.invoices &&
      deal.invoices.length > 0 &&
      deal.invoices.every((inv: any) => inv.paymentStatus === 'PAID');

    if (allInvoicesPaid) {
      await db.wadaanAsset.update({
        where: { id: deal.asset.id },
        data: { status: 'SOLD' }
      });
      bustCache('assets');
      bustCache('reports');
      return true;
    }

    return false;
  }

  /**
   * Re-acquires / re-lists a previously SOLD property with a new acquisition cost and purchase date.
   * Preserves the original SOLD asset record for historical audit and deal profit tracking,
   * while creating a fresh AVAILABLE asset ready for new contracts.
   */
  static async reacquireAsset(
    id: string,
    data: {
      acquisitionCost: number | string;
      acquisitionDate: string;
      description?: string | null;
    }
  ) {
    const existing = await prisma.wadaanAsset.findUnique({
      where: { id },
      include: { deal: true }
    });

    if (!existing) {
      throw new AppError(`Asset with ID '${id}' not found`, 404, 'ASSET_NOT_FOUND');
    }

    if (existing.status !== 'SOLD') {
      throw new AppError(
        `Only properties in SOLD status can be re-acquired. Currently: ${existing.status}`,
        400,
        'ASSET_NOT_SOLD'
      );
    }

    const decCost = new Decimal(data.acquisitionCost);
    if (decCost.lessThanOrEqualTo(0)) {
      throw new AppError('Acquisition cost must be greater than zero', 400, 'INVALID_ACQUISITION_COST');
    }

    const newAsset = await prisma.wadaanAsset.create({
      data: {
        assetTitle: existing.assetTitle,
        assetCategory: existing.assetCategory,
        acquisitionCost: decCost,
        acquisitionDate: new Date(data.acquisitionDate),
        description: data.description ?? existing.description,
        status: 'AVAILABLE',
        dealId: null
      }
    });

    bustCache('assets');
    bustCache('reports');

    return newAsset;
  }
}
