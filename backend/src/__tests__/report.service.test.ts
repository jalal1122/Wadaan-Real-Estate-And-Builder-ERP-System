import { ReportService } from '../services/report.service';
import { prisma } from '../config/db';
import { AccountCategory } from '@prisma/client';

jest.mock('../config/db', () => ({
  prisma: {
    account: {
      findMany: jest.fn(),
    },
    journalLine: {
      groupBy: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('ReportService.getTrialBalance', () => {
  const mockAccounts = [
    {
      id: 'acc-asset',
      accountCode: '1001',
      accountName: 'Cash in Bank',
      category: AccountCategory.ASSET,
      isArchived: false,
    },
    {
      id: 'acc-liability',
      accountCode: '2001',
      accountName: 'Accounts Payable',
      category: AccountCategory.LIABILITY,
      isArchived: false,
    },
    {
      id: 'acc-revenue',
      accountCode: '4001',
      accountName: 'Sales Revenue',
      category: AccountCategory.REVENUE,
      isArchived: false,
    },
    {
      id: 'acc-zero',
      accountCode: '5001',
      accountName: 'Office Supplies',
      category: AccountCategory.EXPENSE,
      isArchived: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts);
  });

  test('1. returns cumulative balance for ASSET accounts regardless of startDate', async () => {
    // Permanent query should filter entryDate <= endDate without startDate
    (mockPrisma.journalLine.groupBy as jest.Mock).mockImplementation(({ where }) => {
      if (where?.accountId?.in?.includes('acc-asset')) {
        // Assert permanent query does NOT have gte in journal.entryDate
        expect(where.journal?.entryDate?.gte).toBeUndefined();
        expect(where.journal?.entryDate?.lte).toBeDefined();

        return Promise.resolve([
          {
            accountId: 'acc-asset',
            _sum: { debitAmount: '150000.00', creditAmount: '50000.00' },
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const report = await ReportService.getTrialBalance(new Date('2026-06-01'), new Date('2026-06-30'));
    const assetLine = report.accounts.find((a) => a.accountCode === '1001');

    expect(assetLine).toBeDefined();
    expect(assetLine?.debit).toBe('100000.00'); // 150000 - 50000
    expect(assetLine?.credit).toBe('0.00');
  });

  test('2. restricts REVENUE balance strictly to startDate–endDate window', async () => {
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-01-31');

    (mockPrisma.journalLine.groupBy as jest.Mock).mockImplementation(({ where }) => {
      if (where?.accountId?.in?.includes('acc-revenue')) {
        // Assert annual query HAS both gte and lte
        expect(where.journal?.entryDate?.gte).toEqual(startDate);
        expect(where.journal?.entryDate?.lte).toEqual(endDate);

        return Promise.resolve([
          {
            accountId: 'acc-revenue',
            _sum: { debitAmount: '0.00', creditAmount: '75000.00' },
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const report = await ReportService.getTrialBalance(startDate, endDate);
    const revLine = report.accounts.find((a) => a.accountCode === '4001');

    expect(revLine).toBeDefined();
    expect(revLine?.credit).toBe('75000.00');
    expect(revLine?.debit).toBe('0.00');
  });

  test('3. reports isBalanced: true when grandTotalDebit equals grandTotalCredit', async () => {
    (mockPrisma.journalLine.groupBy as jest.Mock).mockImplementation(({ where }) => {
      if (where?.accountId?.in?.includes('acc-asset')) {
        return Promise.resolve([
          {
            accountId: 'acc-asset',
            _sum: { debitAmount: '50000.00', creditAmount: '0.00' },
          },
        ]);
      }
      if (where?.accountId?.in?.includes('acc-revenue')) {
        return Promise.resolve([
          {
            accountId: 'acc-revenue',
            _sum: { debitAmount: '0.00', creditAmount: '50000.00' },
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const report = await ReportService.getTrialBalance();

    expect(report.grandTotalDebit).toBe('50000.00');
    expect(report.grandTotalCredit).toBe('50000.00');
    expect(report.isBalanced).toBe(true);
  });

  test('4. filters out zero-balance accounts from the report accounts list', async () => {
    // acc-zero has 0 debit and 0 credit
    (mockPrisma.journalLine.groupBy as jest.Mock).mockResolvedValue([
      {
        accountId: 'acc-asset',
        _sum: { debitAmount: '10000.00', creditAmount: '0.00' },
      },
      {
        accountId: 'acc-zero',
        _sum: { debitAmount: '500.00', creditAmount: '500.00' }, // net 0
      },
    ]);

    const report = await ReportService.getTrialBalance();
    const zeroAccount = report.accounts.find((a) => a.accountCode === '5001');

    expect(zeroAccount).toBeUndefined();
    expect(report.accounts.length).toBe(1);
    expect(report.accounts[0].accountCode).toBe('1001');
  });
});
