import { BillService } from '../services/bill.service';
import { JournalService } from '../services/journal.service';
import { prisma } from '../config/db';
import Decimal from 'decimal.js';

jest.mock('../config/db', () => {
  const mockClient: any = {
    vendor: { findUnique: jest.fn() },
    project: { findUnique: jest.fn() },
    expenseBill: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    account: { findUnique: jest.fn() },
    $transaction: jest.fn((cb) => cb(mockClient)),
  };
  return { prisma: mockClient };
});

jest.mock('../services/journal.service', () => ({
  JournalService: {
    postEntry: jest.fn().mockResolvedValue({ id: 'je-1', entryNumber: 'JE-0001' }),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('BillService.createBill', () => {
  const mockVendor = { id: 'vend-1', vendorName: 'Al-Madina Bricks' };
  const mockProject = {
    id: 'proj-1',
    projectName: 'Wadaan Commercial',
    masterBOQ: new Decimal(5000000), // 5M BOQ
    expenseBills: [{ grandTotal: new Decimal(4500000) }], // 4.5M already spent
  };

  const mockWipAccount = { id: 'acc-1200', accountCode: '1200', accountName: 'Work in Progress' };
  const mockExpenseAccount = { id: 'acc-5000', accountCode: '5000', accountName: 'General Expenses' };
  const mockApAccount = { id: 'acc-2000', accountCode: '2000', accountName: 'Accounts Payable' };
  const mockSafeAccount = { id: 'acc-safe', accountCode: '1001', accountName: 'Office Cash Safe' };

  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.vendor.findUnique as jest.Mock).mockResolvedValue(mockVendor);
    (mockPrisma.expenseBill.findUnique as jest.Mock).mockResolvedValue(null); // No duplicate
    (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
    (mockPrisma.expenseBill.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ id: 'bill-1', ...data })
    );

    (mockPrisma.account.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where.accountCode === '1200') return Promise.resolve(mockWipAccount);
      if (where.accountCode === '5000') return Promise.resolve(mockExpenseAccount);
      if (where.accountCode === '2000') return Promise.resolve(mockApAccount);
      if (where.id === 'acc-safe') return Promise.resolve(mockSafeAccount);
      return Promise.resolve(null);
    });
  });

  test('1. WIP routing: debits 1200 (WIP) when projectId is provided', async () => {
    const result = await BillService.createBill({
      vendorId: 'vend-1',
      projectId: 'proj-1',
      invoiceNumber: 'INV-1001',
      billDate: '2026-01-01T00:00:00Z',
      paymentType: 'ACCOUNTS_PAYABLE',
      lineItems: [{ description: 'Red Bricks Grade A', quantity: 1000, unitPrice: 200 }], // 200,000
    });

    expect(result.bill).toBeDefined();
    expect(JournalService.postEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          expect.objectContaining({
            accountId: 'acc-1200', // Debit WIP 1200
            debitAmount: new Decimal(200000),
          }),
          expect.objectContaining({
            accountId: 'acc-2000', // Credit AP 2000
            creditAmount: new Decimal(200000),
          }),
        ],
      }),
      expect.anything(),
      { skipLockCheck: true }
    );
  });

  test('2. Overhead routing: debits 5000 (Expense) when projectId is null', async () => {
    await BillService.createBill({
      vendorId: 'vend-1',
      projectId: null,
      invoiceNumber: 'INV-1002',
      billDate: '2026-01-01T00:00:00Z',
      paymentType: 'ACCOUNTS_PAYABLE',
      lineItems: [{ description: 'Office Stationary', quantity: 5, unitPrice: 1000 }], // 5,000
    });

    expect(JournalService.postEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          expect.objectContaining({
            accountId: 'acc-5000', // Debit 5000 Expense
            debitAmount: new Decimal(5000),
          }),
          expect.objectContaining({
            accountId: 'acc-2000',
            creditAmount: new Decimal(5000),
          }),
        ],
      }),
      expect.anything(),
      { skipLockCheck: true }
    );
  });

  test('3. DIRECT_CASH: bill status set to PAID, pendingAmount = 0, and credits sourceAccountId', async () => {
    const result = await BillService.createBill({
      vendorId: 'vend-1',
      projectId: null,
      invoiceNumber: 'INV-CASH',
      billDate: '2026-01-01T00:00:00Z',
      paymentType: 'DIRECT_CASH',
      sourceAccountId: 'acc-safe',
      lineItems: [{ description: 'Instant Courier', quantity: 1, unitPrice: 1500 }],
    });

    expect(result.bill.paymentStatus).toBe('PAID');
    expect(result.bill.pendingAmount.toString()).toBe('0');

    expect(JournalService.postEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: expect.arrayContaining([
          expect.objectContaining({
            accountId: 'acc-safe', // Credit Cash Safe
            creditAmount: new Decimal(1500),
          }),
        ]),
      }),
      expect.anything(),
      expect.anything()
    );
  });

  test('4. ACCOUNTS_PAYABLE: bill status set to UNPAID and pendingAmount equals grandTotal', async () => {
    const result = await BillService.createBill({
      vendorId: 'vend-1',
      projectId: null,
      invoiceNumber: 'INV-AP',
      billDate: '2026-01-01T00:00:00Z',
      paymentType: 'ACCOUNTS_PAYABLE',
      lineItems: [{ description: 'Timber Logs', quantity: 10, unitPrice: 10000 }], // 100,000
    });

    expect(result.bill.paymentStatus).toBe('UNPAID');
    expect(result.bill.pendingAmount.toString()).toBe('100000');
  });

  test('5. throws DUPLICATE_INVOICE (409) if invoiceNumber already exists for vendor', async () => {
    (mockPrisma.expenseBill.findUnique as jest.Mock).mockResolvedValue({ id: 'bill-existing' });

    await expect(
      BillService.createBill({
        vendorId: 'vend-1',
        invoiceNumber: 'DUPLICATE-INV',
        billDate: '2026-01-01T00:00:00Z',
        paymentType: 'ACCOUNTS_PAYABLE',
        lineItems: [{ description: 'Steel', quantity: 1, unitPrice: 1000 }],
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'DUPLICATE_INVOICE',
    });
  });

  test('6. budget overrun: detects isOverBudget = true and calculates overBudgetAmount', async () => {
    // Current project has 4.5M spent with 5.0M masterBOQ.
    // Adding 1.0M bill brings total spent to 5.5M, exceeding BOQ by 500,000.
    const result = await BillService.createBill({
      vendorId: 'vend-1',
      projectId: 'proj-1',
      invoiceNumber: 'INV-OVER',
      billDate: '2026-01-01T00:00:00Z',
      paymentType: 'ACCOUNTS_PAYABLE',
      lineItems: [{ description: 'Roof Slab Concrete', quantity: 1, unitPrice: 1000000 }],
    });

    expect(result.isOverBudget).toBe(true);
    expect(result.overBudgetAmount.toString()).toBe('500000');
  });

  test('7. throws VENDOR_NOT_FOUND (404) if vendor does not exist', async () => {
    (mockPrisma.vendor.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      BillService.createBill({
        vendorId: 'non-existent-vendor',
        invoiceNumber: 'INV-NONE',
        billDate: '2026-01-01T00:00:00Z',
        paymentType: 'ACCOUNTS_PAYABLE',
        lineItems: [{ description: 'Items', quantity: 1, unitPrice: 100 }],
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'VENDOR_NOT_FOUND',
    });
  });
});
