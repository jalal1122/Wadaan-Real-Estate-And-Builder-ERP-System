import { JournalService } from '../services/journal.service';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { getCache, setCache } from '../utils/cache.util';

// Mock Prisma to avoid hitting the real DB in unit tests
jest.mock('../config/db', () => ({
  prisma: {
    journalEntry: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
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
    (mockPrisma.account.findMany as jest.Mock).mockImplementation(({ where }) => {
      if (where?.id?.in) {
        return Promise.resolve(mockAccounts.filter((a) => where.id.in.includes(a.id)));
      }
      return Promise.resolve(mockAccounts);
    });
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
      code: 'UNBALANCED_JOURNAL',
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
      code: 'ERR_SYSTEM_ACCOUNT_LOCKED',
    });
  });

  test('6. busts journals cache when entry is posted', async () => {
    process.env.ENABLE_TEST_CACHE = 'true';
    setCache('journals:entries:page:1:limit:20', { entries: [], total: 0 }, 60000);
    expect(getCache('journals:entries:page:1:limit:20')).not.toBeNull();

    const payload = {
      description: 'Owner withdrawal',
      entryDate: new Date().toISOString(),
      lines: [
        { accountId: 'acc-1', debitAmount: 10000, creditAmount: 0 },
        { accountId: 'acc-2', debitAmount: 0, creditAmount: 10000 },
      ],
    };

    await JournalService.postEntry(payload as any);

    expect(getCache('journals:entries:page:1:limit:20')).toBeNull();
    delete process.env.ENABLE_TEST_CACHE;
  });

  test('7. reverseEntry inverts debits and credits and preserves memo, partyId, and projectId', async () => {
    const originalEntry = {
      id: 'je-orig-1',
      entryNumber: 'JV-0010',
      entryDate: new Date(),
      description: 'Vendor payment for materials',
      lines: [
        {
          id: 'jl-1',
          accountId: 'acc-1',
          debitAmount: 25000,
          creditAmount: 0,
          memo: 'Cement purchase',
          customerId: null,
          vendorId: 'vend-101',
          projectId: 'proj-50',
        },
        {
          id: 'jl-2',
          accountId: 'acc-2',
          debitAmount: 0,
          creditAmount: 25000,
          memo: 'Bank transfer',
          customerId: null,
          vendorId: null,
          projectId: null,
        },
      ],
    };

    (mockPrisma.journalEntry.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where.id === 'je-orig-1') return Promise.resolve(originalEntry);
      return Promise.resolve(null);
    });

    let createdReversalData: any = null;
    (mockPrisma.journalEntry.create as jest.Mock).mockImplementation(({ data }) => {
      createdReversalData = data;
      return Promise.resolve({
        id: 'je-rev-1',
        ...data,
      });
    });

    const reversal = await JournalService.reverseEntry('je-orig-1');

    expect(reversal).toBeDefined();
    expect(createdReversalData.description).toBe('[REVERSAL] Vendor payment for materials');
    expect(createdReversalData.lines.create).toHaveLength(2);

    // First line should invert (credit becomes 25000, debit becomes 0)
    expect(createdReversalData.lines.create[0]).toMatchObject({
      accountId: 'acc-1',
      debitAmount: 0,
      creditAmount: 25000,
      memo: '[REVERSAL] Cement purchase',
      vendorId: 'vend-101',
      projectId: 'proj-50',
    });

    // Second line should invert (debit becomes 25000, credit becomes 0)
    expect(createdReversalData.lines.create[1]).toMatchObject({
      accountId: 'acc-2',
      debitAmount: 25000,
      creditAmount: 0,
    });
  });

  test('8. reverseEntry rejects reversing an already reversed entry', async () => {
    (mockPrisma.journalEntry.findUnique as jest.Mock).mockResolvedValue({
      id: 'je-rev-existing',
      entryNumber: 'JV-0011',
      description: '[REVERSAL] Previous error fix',
      lines: [],
    });

    await expect(JournalService.reverseEntry('je-rev-existing')).rejects.toMatchObject({
      code: 'ALREADY_REVERSED',
    });
  });

  test('9. reverseLastEntry finds the latest non-reversal entry and reverses it', async () => {
    const lastEntry = {
      id: 'je-latest',
      entryNumber: 'JV-0099',
      entryDate: new Date(),
      description: 'Recent office supply cash expense',
      lines: [
        { id: 'jl-3', accountId: 'acc-1', debitAmount: 5000, creditAmount: 0, memo: null, customerId: null, vendorId: null, projectId: null },
        { id: 'jl-4', accountId: 'acc-2', debitAmount: 0, creditAmount: 5000, memo: null, customerId: null, vendorId: null, projectId: null },
      ],
    };

    (mockPrisma.journalEntry.findFirst as jest.Mock).mockResolvedValue(lastEntry);
    (mockPrisma.journalEntry.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where.id === 'je-latest') return Promise.resolve(lastEntry);
      return Promise.resolve(null);
    });

    const result = await JournalService.reverseLastEntry();

    expect(result.original.id).toBe('je-latest');
    expect(result.reversal).toBeDefined();
    expect(mockPrisma.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: '[REVERSAL] Recent office supply cash expense',
        }),
      })
    );
  });
});
