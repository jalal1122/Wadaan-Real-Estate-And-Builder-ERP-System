import { ReceiptService } from '../services/receipt.service';
import { JournalService } from '../services/journal.service';
import { prisma } from '../config/db';
import Decimal from 'decimal.js';

jest.mock('../config/db', () => ({
  prisma: {
    $transaction: jest.fn(),
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    dealInvoice: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    dealClient: {
      findUnique: jest.fn(),
    },
    receipt: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('../services/journal.service', () => ({
  JournalService: {
    postEntry: jest.fn().mockResolvedValue({ id: 'je-rcpt', entryNumber: 'JV-RCPT-01' }),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('ReceiptService — Cash, Cheque & Clearance Workflow', () => {
  const mockCustomer = {
    id: 'cust-101',
    fullName: 'Jalal Ahmad',
    phone: '03001234567',
    walletBalance: new Decimal(0),
  };

  const mockInvoice = {
    id: 'inv-101',
    dealId: 'deal-101',
    description: 'Milestone 1 Payment',
    amount: new Decimal(500000),
    paidAmount: new Decimal(0),
    paymentStatus: 'UNPAID',
    deal: {
      id: 'deal-101',
      customerId: 'cust-101',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logInflow', () => {
    test('RS-1: logInflow CASH — invoices marked PAID, GL posted immediately', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
            update: jest.fn(),
          },
          dealInvoice: {
            findMany: jest.fn().mockResolvedValue([mockInvoice]),
            update: jest.fn().mockResolvedValue({ ...mockInvoice, paymentStatus: 'PAID' }),
          },
          receipt: {
            create: jest.fn().mockResolvedValue({
              id: 'rcpt-1',
              customerId: 'cust-101',
              amount: new Decimal(500000),
              paymentMethod: 'CASH',
              clearanceStatus: 'CLEARED',
            }),
          },
          account: {
            findUnique: jest.fn().mockImplementation(({ where }) => {
              if (where.accountCode === '1000') return Promise.resolve({ id: 'acc-cash', accountCode: '1000' });
              if (where.accountCode === '1100') return Promise.resolve({ id: 'acc-ar', accountCode: '1100' });
              return Promise.resolve(null);
            }),
            findFirst: jest.fn().mockResolvedValue({ id: 'acc-cash', accountCode: '1000' }),
          },
        };
        return callback(tx);
      });

      const result = await ReceiptService.logInflow({
        customerId: 'cust-101',
        amount: 500000,
        paymentMethod: 'CASH',
        invoiceIds: ['inv-101'],
      });

      expect(result.status).toBe('CLEARED');
      expect(result.receipt.clearanceStatus).toBe('CLEARED');
      expect(JournalService.postEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Cash Receipt'),
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-cash' }),
            expect.objectContaining({ accountId: 'acc-ar' }),
          ]),
        }),
        expect.anything(),
        { skipLockCheck: true }
      );
    });

    test('RS-2: logInflow CHEQUE — enters Waiting Room as PENDING, invoices set PENDING_CLEARANCE, no GL', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
          },
          dealInvoice: {
            findMany: jest.fn().mockResolvedValue([mockInvoice]),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            update: jest.fn().mockResolvedValue({ ...mockInvoice, paymentStatus: 'PENDING_CLEARANCE' }),
          },
          receipt: {
            create: jest.fn().mockResolvedValue({
              id: 'rcpt-cheque-1',
              customerId: 'cust-101',
              amount: new Decimal(500000),
              paymentMethod: 'CHEQUE',
              bankRefNumber: 'CHQ-999',
              clearanceStatus: 'PENDING',
            }),
          },
        };
        return callback(tx);
      });

      const result = await ReceiptService.logInflow({
        customerId: 'cust-101',
        amount: 500000,
        paymentMethod: 'CHEQUE',
        bankRefNumber: 'CHQ-999',
        invoiceIds: ['inv-101'],
      });

      expect(result.status).toBe('PENDING');
      expect(result.invoicesPendingClearance).toBe(1);
      expect(JournalService.postEntry).not.toHaveBeenCalled();
    });

    test('RS-3: logInflow — overpayment routes excess amount to Customer walletBalance', async () => {
      let updatedWalletBalance: Decimal | null = null;

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
            update: jest.fn().mockImplementation(({ data }) => {
              updatedWalletBalance = data.walletBalance.increment;
              return Promise.resolve({ ...mockCustomer, walletBalance: new Decimal(200000) });
            }),
          },
          dealInvoice: {
            findMany: jest.fn().mockResolvedValue([mockInvoice]), // 500,000 invoice
            update: jest.fn().mockResolvedValue({ ...mockInvoice, paymentStatus: 'PAID' }),
          },
          receipt: {
            create: jest.fn().mockResolvedValue({
              id: 'rcpt-over-1',
              customerId: 'cust-101',
              amount: new Decimal(700000), // 700,000 paid (200,000 excess)
              paymentMethod: 'CASH',
              clearanceStatus: 'CLEARED',
            }),
          },
          account: {
            findUnique: jest.fn().mockImplementation(({ where }) => {
              if (where.accountCode === '1000') return Promise.resolve({ id: 'acc-cash', accountCode: '1000' });
              if (where.accountCode === '1100') return Promise.resolve({ id: 'acc-ar', accountCode: '1100' });
              if (where.accountCode === '2100') return Promise.resolve({ id: 'acc-adv', accountCode: '2100' });
              return Promise.resolve(null);
            }),
            findFirst: jest.fn().mockResolvedValue({ id: 'acc-cash', accountCode: '1000' }),
          },
        };
        return callback(tx);
      });

      const result = await ReceiptService.logInflow({
        customerId: 'cust-101',
        amount: 700000,
        paymentMethod: 'CASH',
        invoiceIds: ['inv-101'],
      });

      expect(result.status).toBe('CLEARED');
      expect((result as any).excessInjectedToWallet?.toNumber()).toBe(200000);
      expect(updatedWalletBalance).toBeDefined();
    });

    test('RS-4: logInflow — co-client payer is allowed to pay primary client invoices', async () => {
      const coClientCustomer = {
        id: 'cust-coclient',
        fullName: 'Asif CoClient',
        phone: '03009999999',
        walletBalance: new Decimal(0),
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(coClientCustomer),
          },
          dealInvoice: {
            findMany: jest.fn().mockResolvedValue([mockInvoice]), // owned by cust-101
            update: jest.fn().mockResolvedValue({ ...mockInvoice, paymentStatus: 'PAID' }),
          },
          dealClient: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'dc-1',
              dealId: 'deal-101',
              customerId: 'cust-coclient',
            }),
          },
          receipt: {
            create: jest.fn().mockResolvedValue({
              id: 'rcpt-co-1',
              customerId: 'cust-coclient',
              amount: new Decimal(500000),
              paymentMethod: 'CASH',
              clearanceStatus: 'CLEARED',
            }),
          },
          account: {
            findUnique: jest.fn().mockImplementation(({ where }) => {
              if (where.accountCode === '1000') return Promise.resolve({ id: 'acc-cash', accountCode: '1000' });
              if (where.accountCode === '1100') return Promise.resolve({ id: 'acc-ar', accountCode: '1100' });
              return Promise.resolve(null);
            }),
            findFirst: jest.fn().mockResolvedValue({ id: 'acc-cash', accountCode: '1000' }),
          },
        };
        return callback(tx);
      });

      const result = await ReceiptService.logInflow({
        customerId: 'cust-coclient',
        amount: 500000,
        paymentMethod: 'CASH',
        invoiceIds: ['inv-101'],
      });

      expect(result.status).toBe('CLEARED');
    });

    test('RS-5: logInflow — rejects INVOICE_CUSTOMER_MISMATCH for unrelated third-party payer', async () => {
      const thirdPartyCustomer = {
        id: 'cust-random',
        fullName: 'Random Person',
        phone: '03000000000',
        walletBalance: new Decimal(0),
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(thirdPartyCustomer),
          },
          dealInvoice: {
            findMany: jest.fn().mockResolvedValue([mockInvoice]), // owned by cust-101
          },
          dealClient: {
            findUnique: jest.fn().mockResolvedValue(null), // Not a co-client
          },
        };
        return callback(tx);
      });

      await expect(
        ReceiptService.logInflow({
          customerId: 'cust-random',
          amount: 500000,
          paymentMethod: 'CASH',
          invoiceIds: ['inv-101'],
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVOICE_CUSTOMER_MISMATCH',
      });
    });

    test('RS-6: logInflow — rejects INVOICE_ALREADY_PAID if invoice status is PAID', async () => {
      const alreadyPaidInvoice = {
        ...mockInvoice,
        paymentStatus: 'PAID',
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
          },
          dealInvoice: {
            findMany: jest.fn().mockResolvedValue([alreadyPaidInvoice]),
          },
        };
        return callback(tx);
      });

      await expect(
        ReceiptService.logInflow({
          customerId: 'cust-101',
          amount: 500000,
          paymentMethod: 'CASH',
          invoiceIds: ['inv-101'],
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVOICE_ALREADY_PAID',
      });
    });
  });

  describe('settlePendingCheque & bounceCheque', () => {
    const mockPendingReceipt = {
      id: 'rcpt-pending-1',
      customerId: 'cust-101',
      amount: new Decimal(500000),
      paymentMethod: 'CHEQUE',
      bankRefNumber: 'CHQ-1234',
      clearanceStatus: 'PENDING',
      customer: mockCustomer,
    };

    test('RS-7: settlePendingCheque — transitions to CLEARED, marks invoices PAID, and posts GL', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          receipt: {
            findUnique: jest.fn().mockResolvedValue(mockPendingReceipt),
            update: jest.fn().mockResolvedValue({
              ...mockPendingReceipt,
              clearanceStatus: 'CLEARED',
            }),
          },
          account: {
            findUnique: jest.fn().mockImplementation(({ where }) => {
              if (where.id === 'acc-meezan') return Promise.resolve({ id: 'acc-meezan', accountCode: '1001', category: 'ASSET' });
              if (where.accountCode === '1100') return Promise.resolve({ id: 'acc-ar', accountCode: '1100' });
              return Promise.resolve(null);
            }),
          },
          dealInvoice: {
            findMany: jest.fn().mockResolvedValue([
              { ...mockInvoice, receiptId: 'rcpt-pending-1', paymentStatus: 'PENDING_CLEARANCE' },
            ]),
            updateMany: jest.fn(),
            update: jest.fn().mockResolvedValue({ ...mockInvoice, paymentStatus: 'PAID' }),
          },
        };
        return callback(tx);
      });

      const result = await ReceiptService.settlePendingCheque('rcpt-pending-1', 'acc-meezan');

      expect(result.receipt.clearanceStatus).toBe('CLEARED');
      expect(JournalService.postEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Cheque Cleared'),
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-meezan' }),
            expect.objectContaining({ accountId: 'acc-ar' }),
          ]),
        }),
        expect.anything(),
        { skipLockCheck: true }
      );
    });

    test('RS-8: bounceCheque — transitions to BOUNCED, reverts invoices to UNPAID, no GL entry created', async () => {
      let updatedInvoicesPayload: any = null;

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          receipt: {
            findUnique: jest.fn().mockResolvedValue(mockPendingReceipt),
            update: jest.fn().mockResolvedValue({
              ...mockPendingReceipt,
              clearanceStatus: 'BOUNCED',
            }),
          },
          dealInvoice: {
            updateMany: jest.fn().mockImplementation(({ where, data }) => {
              updatedInvoicesPayload = { where, data };
              return Promise.resolve({ count: 1 });
            }),
          },
        };
        return callback(tx);
      });

      const result = await ReceiptService.bounceCheque('rcpt-pending-1');

      expect(result.receipt.clearanceStatus).toBe('BOUNCED');
      expect(updatedInvoicesPayload).toEqual({
        where: {
          receiptId: 'rcpt-pending-1',
          paymentStatus: 'PENDING_CLEARANCE',
        },
        data: {
          paymentStatus: 'UNPAID',
          receiptId: null,
        },
      });
      expect(JournalService.postEntry).not.toHaveBeenCalled();
    });
  });
});
