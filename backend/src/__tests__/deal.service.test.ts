import { DealService } from '../services/deal.service';
import { JournalService } from '../services/journal.service';
import { prisma } from '../config/db';
import Decimal from 'decimal.js';

jest.mock('../config/db', () => ({
  prisma: {
    $transaction: jest.fn(),
    deal: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    dealInvoice: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
    },
    wadaanAsset: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../services/journal.service', () => ({
  JournalService: {
    postEntry: jest.fn().mockResolvedValue({ id: 'je-fee', entryNumber: 'JV-TRANSFER-01' }),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('DealService — Core Contracts & File Transfer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeFileTransfer', () => {
    const originalDeal = {
      id: 'deal-1',
      customerId: 'cust-tariq',
      projectId: 'proj-wh',
      dealType: 'WADAAN_SALE',
      totalValue: new Decimal(10000000),
      customer: {
        id: 'cust-tariq',
        fullName: 'Tariq Client',
        phone: '03001111111',
      },
      invoices: [
        {
          id: 'inv-1',
          amount: new Decimal(5000000),
          paidAmount: new Decimal(5000000),
          paymentStatus: 'PAID',
        },
        {
          id: 'inv-2',
          amount: new Decimal(5000000),
          paidAmount: new Decimal(0),
          paymentStatus: 'UNPAID',
        },
      ],
    };

    const newCustomer = {
      id: 'cust-aslam',
      fullName: 'Chaudri Aslam',
      phone: '03002222222',
      walletBalance: new Decimal(0),
    };

    test('DS-1: executeFileTransfer — happy path (no transfer fee)', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          deal: {
            findUnique: jest.fn().mockResolvedValue(originalDeal),
            update: jest.fn().mockResolvedValue({
              ...originalDeal,
              customerId: newCustomer.id,
              customer: newCustomer,
            }),
          },
          customer: {
            findUnique: jest.fn().mockResolvedValue(newCustomer),
          },
        };
        return callback(tx);
      });

      const result = await DealService.executeFileTransfer('deal-1', {
        newCustomerId: 'cust-aslam',
        transferFeeAmount: 0,
      });

      expect(result.previousCustomerId).toBe('cust-tariq');
      expect(result.previousCustomerName).toBe('Tariq Client');
      expect(result.newCustomer.fullName).toBe('Chaudri Aslam');
      expect(result.feeInvoice).toBeNull();
      expect(JournalService.postEntry).not.toHaveBeenCalled();
    });

    test('DS-2: executeFileTransfer — with transfer fee, creates fee invoice and posts GL journal', async () => {
      const mockFeeInvoice = {
        id: 'fee-inv-1',
        dealId: 'deal-1',
        description: 'File Transfer Fee (from Tariq Client to Chaudri Aslam)',
        amount: new Decimal(50000),
        paymentStatus: 'UNPAID',
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          deal: {
            findUnique: jest.fn().mockResolvedValue(originalDeal),
            update: jest.fn().mockResolvedValue({
              ...originalDeal,
              customerId: newCustomer.id,
              totalValue: new Decimal(10050000),
              customer: newCustomer,
            }),
          },
          customer: {
            findUnique: jest.fn().mockResolvedValue(newCustomer),
          },
          dealInvoice: {
            create: jest.fn().mockResolvedValue(mockFeeInvoice),
          },
          account: {
            findUnique: jest.fn().mockImplementation(({ where }) => {
              if (where.accountCode === '1100') return Promise.resolve({ id: 'acc-ar', accountCode: '1100' });
              if (where.accountCode === '4000') return Promise.resolve({ id: 'acc-rev', accountCode: '4000' });
              return Promise.resolve(null);
            }),
          },
        };
        return callback(tx);
      });

      const result = await DealService.executeFileTransfer('deal-1', {
        newCustomerId: 'cust-aslam',
        transferFeeAmount: 50000,
      });

      expect(result.feeInvoice).toBeDefined();
      expect(result.feeInvoice?.amount.toNumber()).toBe(50000);
      expect(JournalService.postEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('File Transfer Fee'),
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-ar' }),
            expect.objectContaining({ accountId: 'acc-rev' }),
          ]),
        }),
        expect.anything(),
        { skipLockCheck: true }
      );
    });

    test('DS-3: executeFileTransfer — rejects SAME_CUSTOMER_TRANSFER', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          deal: {
            findUnique: jest.fn().mockResolvedValue(originalDeal),
          },
        };
        return callback(tx);
      });

      await expect(
        DealService.executeFileTransfer('deal-1', {
          newCustomerId: 'cust-tariq',
          transferFeeAmount: 0,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'SAME_CUSTOMER_TRANSFER',
      });
    });

    test('DS-4: executeFileTransfer — rejects ERR_PENDING_FUNDS_LOCKED when receipt clearance is pending', async () => {
      const dealWithPendingCheque = {
        ...originalDeal,
        invoices: [
          {
            id: 'inv-pending',
            amount: new Decimal(2000000),
            paymentStatus: 'PENDING_CLEARANCE',
          },
        ],
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          deal: {
            findUnique: jest.fn().mockResolvedValue(dealWithPendingCheque),
          },
          customer: {
            findUnique: jest.fn().mockResolvedValue(newCustomer),
          },
        };
        return callback(tx);
      });

      await expect(
        DealService.executeFileTransfer('deal-1', {
          newCustomerId: 'cust-aslam',
          transferFeeAmount: 0,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'ERR_PENDING_FUNDS_LOCKED',
      });
    });

    test('DS-5: executeFileTransfer — rejects DEAL_NOT_FOUND', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          deal: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(
        DealService.executeFileTransfer('non-existent-deal', {
          newCustomerId: 'cust-aslam',
          transferFeeAmount: 0,
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'DEAL_NOT_FOUND',
      });
    });

    test('DS-6: executeFileTransfer — rejects NEW_CUSTOMER_NOT_FOUND', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          deal: {
            findUnique: jest.fn().mockResolvedValue(originalDeal),
          },
          customer: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(
        DealService.executeFileTransfer('deal-1', {
          newCustomerId: 'ghost-cust',
          transferFeeAmount: 0,
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NEW_CUSTOMER_NOT_FOUND',
      });
    });
  });

  describe('initializeContract', () => {
    test('DS-7: initializeContract — BROKERAGE type requires commissionAmount', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue({ id: 'cust-1' }),
          },
          project: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(
        DealService.initializeContract({
          customerId: 'cust-1',
          dealType: 'BROKERAGE',
          totalValue: 5000000,
          invoices: [{ description: 'Commission payment', amount: 5000000, dueDate: '2026-10-01' }],
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'COMMISSION_REQUIRED',
      });
    });

    test('DS-8: initializeContract — rejects INVOICES_SUM_MISMATCH when invoices sum !== totalValue', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue({ id: 'cust-1' }),
          },
        };
        return callback(tx);
      });

      await expect(
        DealService.initializeContract({
          customerId: 'cust-1',
          dealType: 'WADAAN_SALE',
          totalValue: 10000000,
          invoices: [
            { description: 'Milestone 1', amount: 4000000, dueDate: '2026-10-01' },
            { description: 'Milestone 2', amount: 5000000, dueDate: '2026-11-01' },
          ], // Sum = 9,000,000 !== 10,000,000
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVOICES_SUM_MISMATCH',
      });
    });

    test('DS-9: initializeContract — rejects attaching to COMPLETED or SUSPENDED project', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue({ id: 'cust-1' }),
          },
          project: {
            findUnique: jest.fn().mockResolvedValue({ id: 'proj-done', status: 'COMPLETED' }),
          },
        };
        return callback(tx);
      });

      await expect(
        DealService.initializeContract({
          customerId: 'cust-1',
          projectId: 'proj-done',
          dealType: 'WADAAN_SALE',
          totalValue: 5000000,
          invoices: [{ description: 'Installment', amount: 5000000, dueDate: '2026-10-01' }],
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'PROJECT_NOT_ACTIVE',
      });
    });

    test('DS-10: initializeContract — WADAAN_SALE with valid AVAILABLE asset reserves asset atomically', async () => {
      const mockAsset = {
        id: 'asset-45',
        assetTitle: 'Plot 45, Block C',
        status: 'AVAILABLE',
        acquisitionCost: new Decimal(4500000),
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue({ id: 'cust-1', fullName: 'Tariq Client' }),
          },
          wadaanAsset: {
            findUnique: jest.fn().mockResolvedValue(mockAsset),
            update: jest.fn().mockResolvedValue({ ...mockAsset, status: 'RESERVED', dealId: 'deal-new' }),
          },
          deal: {
            create: jest.fn().mockResolvedValue({
              id: 'deal-new',
              dealType: 'WADAAN_SALE',
              totalValue: new Decimal(6000000),
              customerId: 'cust-1',
              asset: mockAsset,
            }),
          },
          account: {
            findUnique: jest.fn().mockImplementation(({ where }) => {
              if (where.accountCode === '1100') return { id: 'acc-1100' };
              if (where.accountCode === '4000') return { id: 'acc-4000' };
              return null;
            }),
          },
        };
        return callback(tx);
      });

      const result = await DealService.initializeContract({
        customerId: 'cust-1',
        dealType: 'WADAAN_SALE',
        assetId: 'asset-45',
        totalValue: 6000000,
        invoices: [{ description: 'Booking', amount: 6000000, dueDate: '2026-10-01' }],
      });

      expect(result.id).toBe('deal-new');
    });

    test('DS-11: initializeContract — rejects WADAAN_SALE if asset is already RESERVED or SOLD', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue({ id: 'cust-1', fullName: 'Tariq Client' }),
          },
          wadaanAsset: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'asset-45',
              assetTitle: 'Plot 45',
              status: 'RESERVED',
            }),
          },
        };
        return callback(tx);
      });

      await expect(
        DealService.initializeContract({
          customerId: 'cust-1',
          dealType: 'WADAAN_SALE',
          assetId: 'asset-45',
          totalValue: 6000000,
          invoices: [{ description: 'Booking', amount: 6000000, dueDate: '2026-10-01' }],
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'ASSET_NOT_AVAILABLE',
      });
    });

    test('DS-12: initializeContract — WADAAN_SALE without assetId creates deal normally (backward compatible)', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue({ id: 'cust-1', fullName: 'Tariq Client' }),
          },
          wadaanAsset: {
            findUnique: jest.fn(),
            update: jest.fn(),
          },
          deal: {
            create: jest.fn().mockResolvedValue({
              id: 'deal-legacy',
              dealType: 'WADAAN_SALE',
              totalValue: new Decimal(5000000),
            }),
          },
          account: {
            findUnique: jest.fn().mockImplementation(({ where }) => {
              if (where.accountCode === '1100') return { id: 'acc-1100' };
              if (where.accountCode === '4000') return { id: 'acc-4000' };
              return null;
            }),
          },
        };
        return callback(tx);
      });

      const result = await DealService.initializeContract({
        customerId: 'cust-1',
        dealType: 'WADAAN_SALE',
        totalValue: 5000000,
        invoices: [{ description: 'Full', amount: 5000000, dueDate: '2026-10-01' }],
      });

      expect(result.id).toBe('deal-legacy');
    });

    test('DS-13: getAllDeals & getDealById — subtracts acquisitionCost from netMargin when asset is linked', async () => {
      const dealWithAsset = {
        id: 'deal-with-asset',
        dealType: 'WADAAN_SALE',
        totalValue: new Decimal(6000000),
        invoices: [
          { amount: new Decimal(6000000), paidAmount: new Decimal(6000000), paymentStatus: 'PAID' },
        ],
        asset: {
          id: 'asset-45',
          assetTitle: 'Plot 45',
          acquisitionCost: new Decimal(4500000),
        },
        project: null,
      };

      (mockPrisma.deal.findMany as jest.Mock).mockResolvedValue([dealWithAsset]);

      const deals = await DealService.getAllDeals();
      expect(deals).toHaveLength(1);
      // netMargin = 6,000,000 (collected) - 0 (spentOnSite) - 4,500,000 (assetCost) = 1,500,000
      expect(deals[0].netMargin.toString()).toBe('1500000');
    });
  });
});
