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
      findMany: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    expenseBill: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  account: { findMany: jest.Mock };
  journalLine: { groupBy: jest.Mock; findMany: jest.Mock };
  project: { findUnique: jest.Mock };
  expenseBill: { findMany: jest.Mock };
};

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

describe('ReportService.getProjectLedger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('throws an error if project is not found', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);

    await expect(
      ReportService.getProjectLedger('invalid-proj-id')
    ).rejects.toThrow('Project with ID invalid-proj-id not found');
  });

  test('flattens bill line items and correctly calculates total project cost', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: 'proj-1',
      projectName: 'Wadaan Heights',
      projectPrefix: 'WH',
    });

    mockPrisma.expenseBill.findMany.mockResolvedValue([
      {
        id: 'bill-1',
        invoiceNumber: 'INV-1001',
        billDate: new Date('2026-09-15T00:00:00Z'),
        vendor: { vendorName: 'Al-Hadeed Steel Mills' },
        lineItems: [
          {
            id: 'line-1',
            description: 'Deformed Grade 60 Steel 10mm',
            quantity: '10',
            unitPrice: '25000',
            lineTotal: '250000.00',
          },
          {
            id: 'line-2',
            description: 'Binding Wire 50kg Roll',
            quantity: '2',
            unitPrice: '7500',
            lineTotal: '15000.00',
          },
        ],
      },
      {
        id: 'bill-2',
        invoiceNumber: 'INV-1002',
        billDate: new Date('2026-09-18T00:00:00Z'),
        vendor: { vendorName: 'Bestway Cement' },
        lineItems: [
          {
            id: 'line-3',
            description: 'OPC Grade 53 Cement 50kg Bags',
            quantity: '100',
            unitPrice: '1450',
            lineTotal: '145000.00',
          },
        ],
      },
    ]);

    const result = await ReportService.getProjectLedger('proj-1');

    expect(result.project.projectName).toBe('Wadaan Heights');
    expect(result.lineItems).toHaveLength(3);
    expect(result.lineItems[0].vendorName).toBe('Al-Hadeed Steel Mills');
    expect(result.lineItems[0].description).toBe('Deformed Grade 60 Steel 10mm');
    expect(result.lineItems[0].lineTotal).toBe('250000.00');
    // Total: 250000 + 15000 + 145000 = 410000.00
    expect(result.totalProjectCost).toBe('410000.00');
  });
});

describe('ReportService.getOverheadLedger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches non-project bills (projectId: null) and sums grandTotal', async () => {
    mockPrisma.expenseBill.findMany.mockImplementation(({ where }) => {
      expect(where.projectId).toBeNull();
      return Promise.resolve([
        {
          id: 'bill-oh-1',
          invoiceNumber: 'BILL-ELEC-01',
          billDate: new Date('2026-09-10T00:00:00Z'),
          grandTotal: '75000.00',
          paymentStatus: 'PAID',
          vendor: { vendorName: 'WAPDA Electricity' },
        },
        {
          id: 'bill-oh-2',
          invoiceNumber: 'BILL-OFFICE-RENT',
          billDate: new Date('2026-09-01T00:00:00Z'),
          grandTotal: '150000.00',
          paymentStatus: 'PAID',
          vendor: { vendorName: 'Property Landlord' },
        },
      ]);
    });

    const result = await ReportService.getOverheadLedger();

    expect(result.bills).toHaveLength(2);
    expect(result.bills[0].vendorName).toBe('WAPDA Electricity');
    expect(result.bills[1].grandTotal).toBe('150000.00');
    expect(result.totalOverhead).toBe('225000.00');
  });
});

describe('ReportService.getEquityLedger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches partner drawings debited against equity accounts and handles missing accounts gracefully', async () => {
    mockPrisma.account.findMany.mockResolvedValue([
      {
        id: 'acc-arshad',
        accountCode: '3010-01',
        accountName: 'Owner Drawings & Distributions',
        category: AccountCategory.EQUITY,
      },
    ]);

    mockPrisma.journalLine.findMany.mockImplementation(({ where }) => {
      if (where.accountId === 'acc-arshad') {
        return Promise.resolve([
          {
            id: 'line-draw-1',
            debitAmount: '200000.00',
            memo: 'Cheque #991024 personal withdrawal',
            journal: {
              entryNumber: 'JV-MOD1-002',
              entryDate: new Date('2026-09-08T14:30:00Z'),
              description: 'Owner monthly drawing',
            },
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const result = await ReportService.getEquityLedger();

    // Arshad should have the drawing from 3010-01
    expect(result.arshad.lines).toHaveLength(1);
    expect(result.arshad.lines[0].reference).toBe('JV-MOD1-002');
    expect(result.arshad.lines[0].amount).toBe('200000.00');
    expect(result.arshad.totalDrawings).toBe('200000.00');

    // Zeeshan account 3020 does not exist in DB yet - should gracefully return empty array
    expect(result.zeeshan.lines).toEqual([]);
    expect(result.zeeshan.totalDrawings).toBe('0.00');

    // Grand total = Arshad + Zeeshan = 200,000.00
    expect(result.grandTotal).toBe('200000.00');
  });
});
