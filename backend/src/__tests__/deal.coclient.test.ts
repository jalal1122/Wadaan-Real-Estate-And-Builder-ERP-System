import { DealService } from '../services/deal.service';
import { CustomerService } from '../services/customer.service';
import { ReceiptService } from '../services/receipt.service';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import Decimal from 'decimal.js';

jest.mock('../config/db', () => ({
  prisma: {
    $transaction: jest.fn(),
    deal: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dealClient: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    dealInvoice: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    receipt: {
      create: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../services/journal.service', () => ({
  JournalService: {
    createJournalEntry: jest.fn().mockResolvedValue({ id: 'je-1', entryNumber: 'JE-100' }),
    postEntry: jest.fn().mockResolvedValue({ id: 'je-1', entryNumber: 'JE-100' }),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Multi-Client Deal & Co-Client Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DealService.getCoClients', () => {
    test('1. returns co-clients list ordered by addedAt ascending', async () => {
      (mockPrisma.deal.findUnique as jest.Mock).mockResolvedValue({ id: 'deal-1' });
      const mockCoClients = [
        {
          id: 'dc-1',
          dealId: 'deal-1',
          customerId: 'cust-2',
          shareLabel: '50% share',
          addedAt: new Date('2026-01-01'),
          customer: { id: 'cust-2', fullName: 'Zeeshan CoClient', phone: '03001234567' },
        },
      ];
      (mockPrisma.dealClient.findMany as jest.Mock).mockResolvedValue(mockCoClients);

      const result = await DealService.getCoClients('deal-1');
      expect(result).toHaveLength(1);
      expect(result[0].customer.fullName).toBe('Zeeshan CoClient');
      expect(mockPrisma.dealClient.findMany).toHaveBeenCalledWith({
        where: { dealId: 'deal-1' },
        include: {
          customer: {
            select: { id: true, fullName: true, phone: true },
          },
        },
        orderBy: { addedAt: 'asc' },
      });
    });

    test('2. throws DEAL_NOT_FOUND (404) if deal does not exist', async () => {
      (mockPrisma.deal.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(DealService.getCoClients('invalid-deal')).rejects.toMatchObject({
        statusCode: 404,
        code: 'DEAL_NOT_FOUND',
      });
    });
  });

  describe('DealService.addCoClient', () => {
    test('3. blocks adding the primary client as a co-client (400 CANNOT_ADD_PRIMARY_AS_CO_CLIENT)', async () => {
      (mockPrisma.deal.findUnique as jest.Mock).mockResolvedValue({
        id: 'deal-1',
        customerId: 'cust-primary',
      });

      await expect(
        DealService.addCoClient('deal-1', 'cust-primary', 'Partner')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'CANNOT_ADD_PRIMARY_AS_CO_CLIENT',
      });
    });

    test('4. throws CUSTOMER_NOT_FOUND (404) if customer to add does not exist', async () => {
      (mockPrisma.deal.findUnique as jest.Mock).mockResolvedValue({
        id: 'deal-1',
        customerId: 'cust-primary',
      });
      (mockPrisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        DealService.addCoClient('deal-1', 'nonexistent-cust')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'CUSTOMER_NOT_FOUND',
      });
    });

    test('5. blocks duplicate co-client registration on the same deal (409 DUPLICATE_CO_CLIENT)', async () => {
      (mockPrisma.deal.findUnique as jest.Mock).mockResolvedValue({
        id: 'deal-1',
        customerId: 'cust-primary',
      });
      (mockPrisma.customer.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-coclient',
        fullName: 'Partner User',
      });
      (mockPrisma.dealClient.findUnique as jest.Mock).mockResolvedValue({
        id: 'dc-existing',
        dealId: 'deal-1',
        customerId: 'cust-coclient',
      });

      await expect(
        DealService.addCoClient('deal-1', 'cust-coclient')
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'DUPLICATE_CO_CLIENT',
      });
    });

    test('6. successfully registers a new co-client with shareLabel', async () => {
      (mockPrisma.deal.findUnique as jest.Mock).mockResolvedValue({
        id: 'deal-1',
        customerId: 'cust-primary',
      });
      (mockPrisma.customer.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-coclient',
        fullName: 'Partner User',
      });
      (mockPrisma.dealClient.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.dealClient.create as jest.Mock).mockResolvedValue({
        id: 'dc-new',
        dealId: 'deal-1',
        customerId: 'cust-coclient',
        shareLabel: '50% share',
        customer: { id: 'cust-coclient', fullName: 'Partner User', phone: '03001234567' },
      });

      const res = await DealService.addCoClient('deal-1', 'cust-coclient', '50% share');
      expect(res.id).toBe('dc-new');
      expect(res.shareLabel).toBe('50% share');
      expect(mockPrisma.dealClient.create).toHaveBeenCalledWith({
        data: {
          dealId: 'deal-1',
          customerId: 'cust-coclient',
          shareLabel: '50% share',
        },
        include: {
          customer: {
            select: { id: true, fullName: true, phone: true },
          },
        },
      });
    });
  });

  describe('DealService.updateCoClient', () => {
    test('7. throws CO_CLIENT_NOT_FOUND (404) if co-client record does not belong to deal', async () => {
      (mockPrisma.dealClient.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        DealService.updateCoClient('deal-1', 'dc-wrong', 'New label')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'CO_CLIENT_NOT_FOUND',
      });
    });

    test('8. successfully updates co-client share label', async () => {
      (mockPrisma.dealClient.findFirst as jest.Mock).mockResolvedValue({
        id: 'dc-1',
        dealId: 'deal-1',
      });
      (mockPrisma.dealClient.update as jest.Mock).mockResolvedValue({
        id: 'dc-1',
        shareLabel: '60% share',
        customer: { id: 'cust-2', fullName: 'Partner User', phone: '0300' },
      });

      const res = await DealService.updateCoClient('deal-1', 'dc-1', '60% share');
      expect(res.shareLabel).toBe('60% share');
    });
  });

  describe('DealService.removeCoClient', () => {
    test('9. throws CO_CLIENT_NOT_FOUND (404) if co-client record not found', async () => {
      (mockPrisma.dealClient.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        DealService.removeCoClient('deal-1', 'dc-invalid')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'CO_CLIENT_NOT_FOUND',
      });
    });

    test('10. deletes co-client record and returns success message', async () => {
      (mockPrisma.dealClient.findFirst as jest.Mock).mockResolvedValue({
        id: 'dc-1',
        dealId: 'deal-1',
      });
      (mockPrisma.dealClient.delete as jest.Mock).mockResolvedValue({ id: 'dc-1' });

      const res = await DealService.removeCoClient('deal-1', 'dc-1');
      expect(res.success).toBe(true);
      expect(mockPrisma.dealClient.delete).toHaveBeenCalledWith({ where: { id: 'dc-1' } });
    });
  });

  describe('CustomerService.getCustomerById with Multi-Client Support', () => {
    test('11. returns primary deals and co-client deals with proper attribution', async () => {
      const mockCustomer = {
        id: 'cust-1',
        fullName: 'Zeeshan CoBuyer',
        phone: '03009999999',
        walletBalance: new Decimal(50000),
        deals: [
          {
            id: 'deal-primary',
            dealType: 'WADAAN_SALE',
            totalValue: new Decimal(5000000),
            invoices: [
              {
                id: 'inv-1',
                amount: new Decimal(2500000),
                paidAmount: new Decimal(2500000),
                paymentStatus: 'PAID',
                receipt: {
                  customer: { id: 'cust-1', fullName: 'Zeeshan CoBuyer', phone: '03009999999' },
                },
              },
            ],
            coClients: [
              {
                id: 'dc-1',
                customerId: 'cust-coclient-2',
                shareLabel: '20% share',
                customer: {
                  id: 'cust-coclient-2',
                  fullName: 'Partner User 2',
                  phone: '03001111111',
                  walletBalance: new Decimal(0),
                },
              },
            ],
            project: null,
          },
        ],
        dealClients: [
          {
            id: 'dc-co',
            dealId: 'deal-other',
            customerId: 'cust-1',
            shareLabel: '50% Co-Buyer',
            deal: {
              id: 'deal-other',
              dealType: 'CONSTRUCTION',
              totalValue: new Decimal(10000000),
              customer: { id: 'cust-primary-owner', fullName: 'Owner Client', phone: '03008888888' },
              invoices: [
                {
                  id: 'inv-co-1',
                  amount: new Decimal(5000000),
                  paidAmount: new Decimal(0),
                  paymentStatus: 'UNPAID',
                  receipt: null,
                },
              ],
              coClients: [],
              project: null,
            },
          },
        ],
        receipts: [],
      };

      (mockPrisma.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await CustomerService.getCustomerById('cust-1');
      expect(result.deals).toHaveLength(2);

      // Primary deal
      const primary = result.deals.find((d: any) => d.id === 'deal-primary');
      expect(primary).toBeDefined();
      expect(primary.isPrimary).toBe(true);
      expect(primary.coClients).toHaveLength(1);

      // Co-Client deal
      const coDeal = result.deals.find((d: any) => d.id === 'deal-other');
      expect(coDeal).toBeDefined();
      expect(coDeal.isPrimary).toBe(false);
      expect(coDeal.shareLabel).toBe('50% Co-Buyer');
      expect(coDeal.primaryCustomer.fullName).toBe('Owner Client');
    });
  });

  describe('Receipt Multi-Payer Validation & Routing in ReceiptService.logReceipt', () => {
    test('12. allows registered co-client to pay invoice and does not throw INVOICE_CUSTOMER_MISMATCH', async () => {
      const mockCustomer = {
        id: 'cust-co',
        fullName: 'Co-Buyer Client',
        walletBalance: new Decimal(0),
      };

      const mockInvoice = {
        id: 'inv-1',
        dealId: 'deal-1',
        amount: new Decimal(500000),
        paymentStatus: 'UNPAID',
        deal: {
          id: 'deal-1',
          customerId: 'cust-primary', // Different from payer cust-co
        },
      };

      // Mock transaction execution
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
            update: jest.fn().mockResolvedValue(mockCustomer),
          },
          dealInvoice: {
            findMany: jest.fn().mockResolvedValue([mockInvoice]),
            update: jest.fn().mockResolvedValue(mockInvoice),
          },
          dealClient: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'dc-1',
              dealId: 'deal-1',
              customerId: 'cust-co',
            }),
          },
          receipt: {
            create: jest.fn().mockResolvedValue({
              id: 'rcpt-1',
              customerId: 'cust-co',
              amount: new Decimal(500000),
              clearanceStatus: 'CLEARED',
            }),
          },
          account: {
            findFirst: jest.fn().mockResolvedValue({ id: 'acc-cash', accountCode: '1000' }),
            findUnique: jest.fn().mockResolvedValue({ id: 'acc-cash', accountCode: '1000' }),
          },
        };
        return callback(tx);
      });

      const receipt = await ReceiptService.logInflow({
        customerId: 'cust-co',
        invoiceIds: ['inv-1'],
        amount: 500000,
        paymentMethod: 'CASH',
      });

      expect(receipt).toBeDefined();
      expect(receipt.receipt.id).toBe('rcpt-1');
      expect(receipt.receipt.customerId).toBe('cust-co');
    });

    test('13. rejects payment from an unrelated non-co-client stranger with INVOICE_CUSTOMER_MISMATCH (400)', async () => {
      const mockCustomer = {
        id: 'cust-stranger',
        fullName: 'Stranger Client',
        walletBalance: new Decimal(0),
      };

      const mockInvoice = {
        id: 'inv-1',
        dealId: 'deal-1',
        amount: new Decimal(500000),
        paymentStatus: 'UNPAID',
        deal: {
          id: 'deal-1',
          customerId: 'cust-primary',
        },
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
          },
          dealInvoice: {
            findMany: jest.fn().mockResolvedValue([mockInvoice]),
          },
          dealClient: {
            findUnique: jest.fn().mockResolvedValue(null), // NOT a co-client
          },
        };
        return callback(tx);
      });

      await expect(
        ReceiptService.logInflow({
          customerId: 'cust-stranger',
          invoiceIds: ['inv-1'],
          amount: 500000,
          paymentMethod: 'CASH',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVOICE_CUSTOMER_MISMATCH',
      });
    });

    test('14. routes overpayment excess directly into paying co-client wallet, NOT primary client wallet', async () => {
      const mockCustomer = {
        id: 'cust-co',
        fullName: 'Co-Buyer Client',
        walletBalance: new Decimal(0),
      };

      const mockInvoice = {
        id: 'inv-1',
        dealId: 'deal-1',
        amount: new Decimal(500000),
        paymentStatus: 'UNPAID',
        deal: {
          id: 'deal-1',
          customerId: 'cust-primary',
        },
      };

      let walletUpdatedForCustomerId: string | null = null;
      let walletIncrementAmount: any = null;

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
            update: jest.fn().mockImplementation(({ where, data }: any) => {
              walletUpdatedForCustomerId = where.id;
              walletIncrementAmount = data.walletBalance.increment;
              return { ...mockCustomer, walletBalance: data.walletBalance.increment };
            }),
          },
          dealInvoice: {
            findMany: jest.fn().mockResolvedValue([mockInvoice]),
            update: jest.fn().mockResolvedValue(mockInvoice),
          },
          dealClient: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'dc-1',
              dealId: 'deal-1',
              customerId: 'cust-co',
            }),
          },
          receipt: {
            create: jest.fn().mockResolvedValue({
              id: 'rcpt-1',
              customerId: 'cust-co',
              amount: new Decimal(600000),
              clearanceStatus: 'CLEARED',
            }),
          },
          account: {
            findFirst: jest.fn().mockResolvedValue({ id: 'acc-cash', accountCode: '1000' }),
            findUnique: jest.fn().mockResolvedValue({ id: 'acc-cash', accountCode: '1000' }),
          },
        };
        return callback(tx);
      });

      // Pay 600,000 against 500,000 invoice (100,000 excess)
      await ReceiptService.logInflow({
        customerId: 'cust-co',
        invoiceIds: ['inv-1'],
        amount: 600000,
        paymentMethod: 'CASH',
      });

      expect(walletUpdatedForCustomerId).toBe('cust-co'); // Payer's wallet!
      expect(walletIncrementAmount.toNumber()).toBe(100000);
    });
  });
});
