import { FifoService } from '../services/fifo.service';
import { JournalService } from '../services/journal.service';
import { prisma } from '../config/db';
import Decimal from 'decimal.js';

jest.mock('../config/db', () => {
  const mockClient: any = {
    vendor: { findUnique: jest.fn() },
    account: { findUnique: jest.fn() },
    expenseBill: { findMany: jest.fn(), update: jest.fn() },
    vendorPayment: { create: jest.fn() },
    $transaction: jest.fn((cb) => cb(mockClient)),
  };
  return { prisma: mockClient };
});

jest.mock('../services/journal.service', () => ({
  JournalService: {
    postEntry: jest.fn().mockResolvedValue({ id: 'je-pay-1', entryNumber: 'JE-0005' }),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('FifoService.processPaymentRun', () => {
  const mockVendor = { id: 'vend-1', vendorName: 'Al-Haq Cement' };
  const mockSourceAccount = { id: 'acc-bank', accountCode: '1002', accountName: 'Meezan Bank - Ops' };
  const mockApAccount = { id: 'acc-2000', accountCode: '2000', accountName: 'Accounts Payable' };

  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.vendor.findUnique as jest.Mock).mockResolvedValue(mockVendor);
    (mockPrisma.account.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where.accountCode === '2000') return Promise.resolve(mockApAccount);
      if (where.id === 'acc-bank') return Promise.resolve(mockSourceAccount);
      return Promise.resolve(null);
    });

    (mockPrisma.vendorPayment.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ id: 'pay-1', ...data })
    );

    (mockPrisma.expenseBill.update as jest.Mock).mockImplementation(({ where, data }) =>
      Promise.resolve({ id: where.id, ...data })
    );
  });

  test('1. multi-bill FIFO waterfall: clears Bill A fully, partially clears Bill B', async () => {
    // Two unpaid bills: Bill A (200k, older), Bill B (300k, newer) -> total 500k
    const billA = {
      id: 'bill-a',
      vendorId: 'vend-1',
      invoiceNumber: 'INV-A',
      billDate: new Date('2026-01-01'),
      paymentStatus: 'UNPAID',
      grandTotal: new Decimal(200000),
      pendingAmount: new Decimal(200000),
    };
    const billB = {
      id: 'bill-b',
      vendorId: 'vend-1',
      invoiceNumber: 'INV-B',
      billDate: new Date('2026-02-01'),
      paymentStatus: 'UNPAID',
      grandTotal: new Decimal(300000),
      pendingAmount: new Decimal(300000),
    };

    (mockPrisma.expenseBill.findMany as jest.Mock).mockResolvedValue([billA, billB]);

    // Payment of 350,000 should clear Bill A (200k) and apply 150k to Bill B
    const result = await FifoService.processPaymentRun({
      vendorId: 'vend-1',
      sourceAccountId: 'acc-bank',
      amountPaid: 350000,
      chequeRef: 'CHQ-88991',
      paymentDate: '2026-03-01T00:00:00Z',
    });

    expect(result.settledBills).toHaveLength(2);

    // Bill A: Fully settled
    expect(result.settledBills[0].billId).toBe('bill-a');
    expect(result.settledBills[0].amountApplied.toString()).toBe('200000');
    expect(result.settledBills[0].newPending.toString()).toBe('0');
    expect(result.settledBills[0].status).toBe('PAID');

    // Bill B: Partially settled (150k applied, 150k remaining)
    expect(result.settledBills[1].billId).toBe('bill-b');
    expect(result.settledBills[1].amountApplied.toString()).toBe('150000');
    expect(result.settledBills[1].newPending.toString()).toBe('150000');
    expect(result.settledBills[1].status).toBe('PARTIAL');

    expect(result.totalSettled.toString()).toBe('350000');
    expect(result.remainingVendorOutstanding.toString()).toBe('150000');

    // Journal Entry posted: Debit AP (2000), Credit Bank (1002)
    expect(JournalService.postEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          expect.objectContaining({
            accountId: 'acc-2000',
            debitAmount: new Decimal(350000),
          }),
          expect.objectContaining({
            accountId: 'acc-bank',
            creditAmount: new Decimal(350000),
          }),
        ],
      }),
      expect.anything(),
      { skipLockCheck: true }
    );
  });

  test('2. partial-partial FIFO: subsequent payment continues from existing pendingAmount', async () => {
    // Bill B has grandTotal 300k, but pendingAmount is already reduced to 150k
    const billBPartial = {
      id: 'bill-b',
      vendorId: 'vend-1',
      invoiceNumber: 'INV-B',
      billDate: new Date('2026-02-01'),
      paymentStatus: 'PARTIAL',
      grandTotal: new Decimal(300000),
      pendingAmount: new Decimal(150000),
    };

    (mockPrisma.expenseBill.findMany as jest.Mock).mockResolvedValue([billBPartial]);

    // Pay remaining 150,000
    const result = await FifoService.processPaymentRun({
      vendorId: 'vend-1',
      sourceAccountId: 'acc-bank',
      amountPaid: 150000,
      paymentDate: '2026-03-05T00:00:00Z',
    });

    expect(result.settledBills).toHaveLength(1);
    expect(result.settledBills[0].status).toBe('PAID');
    expect(result.settledBills[0].newPending.toString()).toBe('0');
    expect(result.remainingVendorOutstanding.toString()).toBe('0');
  });

  test('3. throws PAYMENT_EXCEEDS_OUTSTANDING (400) if payment amount exceeds debt', async () => {
    (mockPrisma.expenseBill.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'bill-1',
        pendingAmount: new Decimal(100000),
      },
    ]);

    await expect(
      FifoService.processPaymentRun({
        vendorId: 'vend-1',
        sourceAccountId: 'acc-bank',
        amountPaid: 150000, // 150k > 100k
        paymentDate: '2026-03-01T00:00:00Z',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'PAYMENT_EXCEEDS_OUTSTANDING',
    });
  });

  test('4. throws VENDOR_NOT_FOUND (404) if vendor does not exist', async () => {
    (mockPrisma.vendor.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      FifoService.processPaymentRun({
        vendorId: 'non-existent-vendor',
        sourceAccountId: 'acc-bank',
        amountPaid: 10000,
        paymentDate: '2026-03-01T00:00:00Z',
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'VENDOR_NOT_FOUND',
    });
  });

  test('5. stores transactionId for online bank payment and marks journal description accordingly', async () => {
    const bill = {
      id: 'bill-online-1',
      invoiceNumber: 'INV-ON-001',
      billDate: new Date('2026-02-01'),
      grandTotal: new Decimal(100000),
      pendingAmount: new Decimal(100000),
    };

    (mockPrisma.expenseBill.findMany as jest.Mock).mockResolvedValue([bill]);

    await FifoService.processPaymentRun({
      vendorId: 'vend-1',
      sourceAccountId: 'acc-bank',
      amountPaid: 100000,
      transactionId: 'FT-99882244',
      paymentDate: '2026-03-01T00:00:00Z',
    });

    expect(mockPrisma.vendorPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transactionId: 'FT-99882244',
          chequeRef: null,
          amountPaid: new Decimal(100000),
        }),
      })
    );

    expect(JournalService.postEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('(Online: FT-99882244)'),
      }),
      expect.anything(),
      { skipLockCheck: true }
    );
  });
});
