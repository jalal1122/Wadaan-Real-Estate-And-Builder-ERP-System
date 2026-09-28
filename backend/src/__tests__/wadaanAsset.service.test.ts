import { WadaanAssetService } from '../services/wadaanAsset.service';
import { prisma } from '../config/db';
import Decimal from 'decimal.js';

jest.mock('../config/db', () => ({
  prisma: {
    wadaanAsset: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    deal: {
      findUnique: jest.fn()
    }
  }
}));

jest.mock('../utils/cache.util', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  bustCache: jest.fn()
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('WadaanAssetService — Owned Asset Inventory Registry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // WA-1
  test('WA-1: createAsset — registers asset with status AVAILABLE and Decimal cost', async () => {
    const input = {
      assetTitle: 'Plot 45, Block C, Faisal Town',
      assetCategory: 'PLOT' as const,
      acquisitionCost: 4500000,
      acquisitionDate: '2026-01-15'
    };

    (mockPrisma.wadaanAsset.create as jest.Mock).mockResolvedValue({
      id: 'asset-1',
      ...input,
      acquisitionCost: new Decimal(input.acquisitionCost),
      acquisitionDate: new Date(input.acquisitionDate),
      description: null,
      status: 'AVAILABLE',
      dealId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await WadaanAssetService.createAsset(input);

    expect(mockPrisma.wadaanAsset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assetTitle: 'Plot 45, Block C, Faisal Town',
          assetCategory: 'PLOT',
          status: 'AVAILABLE'
        })
      })
    );
    expect(result.status).toBe('AVAILABLE');
  });

  // WA-2
  test('WA-2: createAsset — permits assets with same title without unique title constraint', async () => {
    const input = {
      assetTitle: 'Standard Plot File',
      assetCategory: 'PLOT' as const,
      acquisitionCost: 2000000,
      acquisitionDate: '2026-02-01'
    };

    (mockPrisma.wadaanAsset.create as jest.Mock)
      .mockResolvedValueOnce({
        id: 'asset-1',
        ...input,
        acquisitionCost: new Decimal(2000000),
        status: 'AVAILABLE'
      })
      .mockResolvedValueOnce({
        id: 'asset-2',
        ...input,
        acquisitionCost: new Decimal(2000000),
        status: 'AVAILABLE'
      });

    const a1 = await WadaanAssetService.createAsset(input);
    const a2 = await WadaanAssetService.createAsset(input);

    expect(a1.id).toBe('asset-1');
    expect(a2.id).toBe('asset-2');
  });

  // WA-3
  test('WA-3: deleteAsset — successfully deletes AVAILABLE unlinked asset', async () => {
    (mockPrisma.wadaanAsset.findUnique as jest.Mock).mockResolvedValue({
      id: 'asset-1',
      assetTitle: 'Plot 10',
      status: 'AVAILABLE',
      dealId: null
    });
    (mockPrisma.wadaanAsset.delete as jest.Mock).mockResolvedValue({ id: 'asset-1' });

    const result = await WadaanAssetService.deleteAsset('asset-1');

    expect(mockPrisma.wadaanAsset.delete).toHaveBeenCalledWith({ where: { id: 'asset-1' } });
    expect(result.success).toBe(true);
  });

  // WA-4
  test('WA-4: deleteAsset — rejects deletion if asset is RESERVED or linked to a deal', async () => {
    (mockPrisma.wadaanAsset.findUnique as jest.Mock).mockResolvedValue({
      id: 'asset-reserved',
      assetTitle: 'Plot 45',
      status: 'RESERVED',
      dealId: 'deal-99'
    });

    await expect(WadaanAssetService.deleteAsset('asset-reserved')).rejects.toMatchObject({
      statusCode: 409,
      code: 'ASSET_LINKED_TO_DEAL'
    });
    expect(mockPrisma.wadaanAsset.delete).not.toHaveBeenCalled();
  });

  // WA-5
  test('WA-5: updateAsset — updates metadata and cost on AVAILABLE asset', async () => {
    (mockPrisma.wadaanAsset.findUnique as jest.Mock).mockResolvedValue({
      id: 'asset-1',
      assetTitle: 'Plot 45 Old',
      status: 'AVAILABLE',
      dealId: null
    });
    (mockPrisma.wadaanAsset.update as jest.Mock).mockResolvedValue({
      id: 'asset-1',
      assetTitle: 'Plot 45 Revised',
      acquisitionCost: new Decimal(5000000),
      status: 'AVAILABLE'
    });

    const updated = await WadaanAssetService.updateAsset('asset-1', {
      assetTitle: 'Plot 45 Revised',
      acquisitionCost: 5000000
    });

    expect(mockPrisma.wadaanAsset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'asset-1' },
        data: expect.objectContaining({
          assetTitle: 'Plot 45 Revised'
        })
      })
    );
    expect(updated.assetTitle).toBe('Plot 45 Revised');
  });

  // WA-6
  test('WA-6: getAllAssets — filters query by status when provided', async () => {
    (mockPrisma.wadaanAsset.findMany as jest.Mock).mockResolvedValue([
      { id: 'asset-1', assetTitle: 'Plot 1', status: 'AVAILABLE' }
    ]);

    const results = await WadaanAssetService.getAllAssets('AVAILABLE');

    expect(mockPrisma.wadaanAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'AVAILABLE' }
      })
    );
    expect(results).toHaveLength(1);
  });

  // WA-7
  test('WA-7: checkAndMarkDealAssetSold — transitions RESERVED asset to SOLD when all invoices are PAID', async () => {
    (mockPrisma.deal.findUnique as jest.Mock).mockResolvedValue({
      id: 'deal-settled-1',
      asset: { id: 'asset-reserved-1', status: 'RESERVED' },
      invoices: [
        { paymentStatus: 'PAID' },
        { paymentStatus: 'PAID' }
      ]
    });
    (mockPrisma.wadaanAsset.update as jest.Mock).mockResolvedValue({
      id: 'asset-reserved-1',
      status: 'SOLD'
    });

    const result = await WadaanAssetService.checkAndMarkDealAssetSold('deal-settled-1');

    expect(result).toBe(true);
    expect(mockPrisma.wadaanAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset-reserved-1' },
      data: { status: 'SOLD' }
    });
  });

  // WA-8
  test('WA-8: checkAndMarkDealAssetSold — leaves asset as RESERVED if any invoice is still unpaid', async () => {
    (mockPrisma.deal.findUnique as jest.Mock).mockResolvedValue({
      id: 'deal-partial-1',
      asset: { id: 'asset-reserved-2', status: 'RESERVED' },
      invoices: [
        { paymentStatus: 'PAID' },
        { paymentStatus: 'PARTIAL' }
      ]
    });

    const result = await WadaanAssetService.checkAndMarkDealAssetSold('deal-partial-1');

    expect(result).toBe(false);
    expect(mockPrisma.wadaanAsset.update).not.toHaveBeenCalled();
  });

  // WA-9
  test('WA-9: reacquireAsset — clones SOLD property into fresh AVAILABLE asset at new buyback cost', async () => {
    (mockPrisma.wadaanAsset.findUnique as jest.Mock).mockResolvedValue({
      id: 'asset-sold-1',
      assetTitle: 'Plot A 12 sudais town',
      assetCategory: 'PLOT',
      acquisitionCost: new Decimal(12000000),
      description: 'Original purchase',
      status: 'SOLD',
      dealId: 'deal-settled'
    });

    (mockPrisma.wadaanAsset.create as jest.Mock).mockResolvedValue({
      id: 'asset-new-1',
      assetTitle: 'Plot A 12 sudais town',
      assetCategory: 'PLOT',
      acquisitionCost: new Decimal(14000000),
      acquisitionDate: new Date('2026-10-01'),
      description: 'Re-acquired from client',
      status: 'AVAILABLE',
      dealId: null
    });

    const reacquired = await WadaanAssetService.reacquireAsset('asset-sold-1', {
      acquisitionCost: 14000000,
      acquisitionDate: '2026-10-01',
      description: 'Re-acquired from client'
    });

    expect(mockPrisma.wadaanAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assetTitle: 'Plot A 12 sudais town',
        assetCategory: 'PLOT',
        status: 'AVAILABLE',
        dealId: null
      })
    });
    expect(reacquired.status).toBe('AVAILABLE');
  });
});
