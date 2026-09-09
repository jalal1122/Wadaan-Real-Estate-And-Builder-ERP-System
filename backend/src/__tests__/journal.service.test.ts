import { JournalService } from '../services/journal.service';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

// Mock Prisma to avoid hitting the real DB in unit tests
jest.mock('../config/db', () => ({
  prisma: {
    journalEntry: {
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    account: {
      findMany: jest.fn(),
    },
    journalLine: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(prisma)),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('JournalService.postEntry', () => {
  const mockAccounts = [
    { id: 'acc-1', accountCode: '1001', accountName: 'Meezan Bank', isSystemLocked: false },
    { id: 'acc-2', accountCode: '3001', accountName: 'Owner Equity', isSystemLocked: false },
    { id: 'acc-locked', accountCode: '2100', accountName: 'Accounts Payable', isSystemLocked: true },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts);
    (mockPrisma.journalEntry.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.journalEntry.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.journalEntry.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'je-1',
        entryNumber: data.entryNumber,
        entryDate: data.entryDate,
        description: data.description,
        lines: [],
      })
    );
  });

  test('1. saves customerId on the correct JournalLine when provided', async () => {
    const payload = {
      description: 'Customer deposit',
      entryDate: new Date().toISOString(),
      lines: [
        { accountId: 'acc-1', debitAmount: 50000, creditAmount: 0, customerId: 'cust-123', vendorId: null, projectId: null },
        { accountId: 'acc-2', debitAmount: 0, creditAmount: 50000 },
      ],
    };

    await JournalService.postEntry(payload as any);

    const createCall = (mockPrisma.journalEntry.create as jest.Mock).mock.calls[0][0];
    const firstLine = createCall.data.lines.create[0];
    expect(firstLine.customerId).toBe('cust-123');
    expect(firstLine.vendorId).toBeNull();
    expect(firstLine.projectId).toBeNull();
  });

  test('2. saves vendorId on the correct JournalLine when provided', async () => {
    const payload = {
      description: 'Vendor advance',
      entryDate: new Date().toISOString(),
      lines: [
        { accountId: 'acc-2', debitAmount: 20000, creditAmount: 0, vendorId: 'vend-456' },
        { accountId: 'acc-1', debitAmount: 0, creditAmount: 20000 },
      ],
    };

    await JournalService.postEntry(payload as any);

    const createCall = (mockPrisma.journalEntry.create as jest.Mock).mock.calls[0][0];
    const firstLine = createCall.data.lines.create[0];
    expect(firstLine.vendorId).toBe('vend-456');
    expect(firstLine.customerId).toBeNull();
  });

  test('3. saves projectId on the correct JournalLine when provided', async () => {
    const payload = {
      description: 'WIP transfer',
      entryDate: new Date().toISOString(),
      lines: [
        { accountId: 'acc-1', debitAmount: 100000, creditAmount: 0, projectId: 'proj-789' },
        { accountId: 'acc-2', debitAmount: 0, creditAmount: 100000 },
      ],
    };

    await JournalService.postEntry(payload as any);

    const createCall = (mockPrisma.journalEntry.create as jest.Mock).mock.calls[0][0];
    const firstLine = createCall.data.lines.create[0];
    expect(firstLine.projectId).toBe('proj-789');
  });

  test('4. throws UNBALANCED_JOURNAL when debits do not equal credits', async () => {
    const payload = {
      description: 'Unbalanced test',
      entryDate: new Date().toISOString(),
      lines: [
        { accountId: 'acc-1', debitAmount: 50000, creditAmount: 0 },
        { accountId: 'acc-2', debitAmount: 0, creditAmount: 49999 }, // off by 1
      ],
    };

    await expect(JournalService.postEntry(payload as any)).rejects.toThrow(AppError);
    await expect(JournalService.postEntry(payload as any)).rejects.toMatchObject({
      errorCode: 'UNBALANCED_JOURNAL',
    });
  });

  test('5. throws ERR_SYSTEM_ACCOUNT_LOCKED when a system-locked account is targeted', async () => {
    (mockPrisma.account.findMany as jest.Mock).mockResolvedValue([
      mockAccounts[0],
      mockAccounts[2], // the locked AP account
    ]);

    const payload = {
      description: 'Illegal manual AP adjustment',
      entryDate: new Date().toISOString(),
      lines: [
        { accountId: 'acc-1', debitAmount: 10000, creditAmount: 0 },
        { accountId: 'acc-locked', debitAmount: 0, creditAmount: 10000 },
      ],
    };

    await expect(JournalService.postEntry(payload as any)).rejects.toMatchObject({
      errorCode: 'ERR_SYSTEM_ACCOUNT_LOCKED',
    });
  });
});
