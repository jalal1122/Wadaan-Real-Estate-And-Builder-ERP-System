import { BillService } from '../services/bill.service';
import { JournalService } from '../services/journal.service';
import { prisma } from '../config/db';
import Decimal from 'decimal.js';

jest.mock('../config/db', () => {
  const mockClient: any = {
    vendor: { findUnique: jest.fn() },
    project: { findUnique: jest.fn() },
    expenseBill: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    billLineItem: { deleteMany: jest.fn(), createMany: jest.fn() },
    journalEntry: { findFirst: jest.fn(), update: jest.fn() },
    journalLine: { update: jest.fn() },
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

  test('8. transactionRef: appends transaction reference to journal description when provided', async () => {
    await BillService.createBill({
      vendorId: 'vend-1',
      projectId: 'proj-1',
      invoiceNumber: 'INV-TRX',
      billDate: '2026-01-01T00:00:00Z',
      paymentType: 'DIRECT_CASH',
      sourceAccountId: 'acc-safe',
      transactionRef: 'UTR-987654',
      lineItems: [{ description: 'Office Consumables', quantity: 1, unitPrice: 25000 }],
    });

    expect(JournalService.postEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('[Trx Ref: UTR-987654]'),
      }),
      expect.anything(),
      expect.anything()
    );
  });
});

describe('BillService.updateBill', () => {
  const mockBill = {
    id: 'bill-1',
    vendorId: 'vend-1',
    projectId: 'proj-1',
    invoiceNumber: 'INV-001',
    billDate: new Date('2026-01-01'),
    paymentType: 'ACCOUNTS_PAYABLE',
    paymentStatus: 'UNPAID',
    grandTotal: new Decimal(100000),
    pendingAmount: new Decimal(100000),
    lineItems: [
      { id: 'li-1', description: 'Item 1', quantity: 1, unitPrice: new Decimal(100000), lineTotal: new Decimal(100000) }
    ],
    vendor: { id: 'vend-1', vendorName: 'Al-Madina Bricks' },
    project: { id: 'proj-1', projectName: 'Wadaan Commercial' }
  };

  const mockJournal = {
    id: 'je-1',
    entryDate: new Date('2026-01-01'),
    description: 'Expense for Project: Wadaan Commercial (Invoice: INV-001)',
    lines: [
      { id: 'jl-1', accountId: 'acc-1200', debitAmount: new Decimal(100000), creditAmount: new Decimal(0), projectId: 'proj-1', vendorId: 'vend-1' },
      { id: 'jl-2', accountId: 'acc-2000', debitAmount: new Decimal(0), creditAmount: new Decimal(100000), projectId: 'proj-1', vendorId: 'vend-1' }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.expenseBill.findUnique as jest.Mock).mockResolvedValue(mockBill);
    (mockPrisma.expenseBill.update as jest.Mock).mockImplementation(({ data }) => Promise.resolve({ ...mockBill, ...data }));
    (mockPrisma.journalEntry.findFirst as jest.Mock).mockResolvedValue(mockJournal);
    (mockPrisma.journalEntry.update as jest.Mock).mockResolvedValue(mockJournal);
    (mockPrisma.journalLine.update as jest.Mock).mockResolvedValue({});
    (mockPrisma.billLineItem.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
    (mockPrisma.billLineItem.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue({ id: 'acc-1200', accountCode: '1200' });
  });

  test('UB-1: updates invoiceNumber and synchronizes linked journal description', async () => {
    const updated = await BillService.updateBill('bill-1', {
      invoiceNumber: 'INV-001-REV',
    });

    expect(mockPrisma.expenseBill.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bill-1' },
        data: expect.objectContaining({
          invoiceNumber: 'INV-001-REV',
        }),
      })
    );

    expect(mockPrisma.journalEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'je-1' },
        data: expect.objectContaining({
          description: expect.stringContaining('(Invoice: INV-001-REV)'),
        }),
      })
    );
  });

  test('UB-2: updates line items and grand total on an UNPAID bill and syncs journal lines', async () => {
    await BillService.updateBill('bill-1', {
      lineItems: [
        { description: 'Cement Grade A', quantity: 2, unitPrice: 75000 } // Total: 150,000
      ]
    });

    expect(mockPrisma.billLineItem.deleteMany).toHaveBeenCalledWith({ where: { billId: 'bill-1' } });
    expect(mockPrisma.billLineItem.createMany).toHaveBeenCalled();
    expect(mockPrisma.expenseBill.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          grandTotal: new Decimal(150000),
          pendingAmount: new Decimal(150000),
          paymentStatus: 'UNPAID',
        }),
      })
    );

    expect(mockPrisma.journalLine.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'jl-1' },
        data: expect.objectContaining({
          debitAmount: new Decimal(150000),
        }),
      })
    );
  });

  test('UB-3: throws error if reducing total below already settled amount on PARTIAL bill', async () => {
    const partialBill = {
      ...mockBill,
      paymentStatus: 'PARTIAL',
      grandTotal: new Decimal(100000),
      pendingAmount: new Decimal(40000), // 60,000 already paid
    };
    (mockPrisma.expenseBill.findUnique as jest.Mock).mockResolvedValue(partialBill);

    await expect(
      BillService.updateBill('bill-1', {
        lineItems: [
          { description: 'Reduced Item', quantity: 1, unitPrice: 50000 } // 50,000 is less than 60,000 paid
        ]
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_BILL_AMOUNT',
    });
  });

  test('UB-4: throws DUPLICATE_INVOICE (409) if new invoice number already exists for vendor', async () => {
    (mockPrisma.expenseBill.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockBill) // first call: finds bill-1
      .mockResolvedValueOnce({ id: 'bill-duplicate', vendorId: 'vend-1', invoiceNumber: 'INV-EXISTING' }); // duplicate check

    await expect(
      BillService.updateBill('bill-1', {
        invoiceNumber: 'INV-EXISTING',
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'DUPLICATE_INVOICE',
    });
  });
});

