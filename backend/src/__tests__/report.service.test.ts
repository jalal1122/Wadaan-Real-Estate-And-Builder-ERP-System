import { ReportService } from '../services/report.service';
import { prisma } from '../config/db';
import { AccountCategory } from '@prisma/client';

jest.mock('../config/db', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([]),
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
  $queryRaw: jest.Mock;
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
    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
      { id: 'acc-asset', accountCode: '1001', accountName: 'Cash in Bank', category: 'ASSET', totalDebit: 150000, totalCredit: 50000 }
    ]);

    const report = await ReportService.getTrialBalance(new Date('2026-06-01'), new Date('2026-06-30'));
    const assetLine = report.accounts.find((a) => a.accountCode === '1001');

    expect(assetLine).toBeDefined();
    expect(assetLine?.debit).toBe('100000.00'); // 150000 - 50000
    expect(assetLine?.credit).toBe('0.00');
  });

  test('2. restricts REVENUE balance strictly to startDate–endDate window', async () => {
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-01-31');

    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
      { id: 'acc-revenue', accountCode: '4001', accountName: 'Sales Revenue', category: 'REVENUE', totalDebit: 0, totalCredit: 75000 }
    ]);

    const report = await ReportService.getTrialBalance(startDate, endDate);
    const revLine = report.accounts.find((a) => a.accountCode === '4001');

    expect(revLine).toBeDefined();
    expect(revLine?.credit).toBe('75000.00');
    expect(revLine?.debit).toBe('0.00');
  });

  test('3. reports isBalanced: true when grandTotalDebit equals grandTotalCredit', async () => {

    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
      { id: 'acc-asset', accountCode: '1001', accountName: 'Cash', category: 'ASSET', totalDebit: 50000, totalCredit: 0 },
      { id: 'acc-liability', accountCode: '2001', accountName: 'AP', category: 'LIABILITY', totalDebit: 0, totalCredit: 50000 },
    ]);

    const report = await ReportService.getTrialBalance();

    expect(report.grandTotalDebit).toBe('50000.00');
    expect(report.grandTotalCredit).toBe('50000.00');
    expect(report.isBalanced).toBe(true);
  });

  test('4. filters out zero-balance accounts from the report accounts list', async () => {
    // acc-zero has 0 debit and 0 credit
    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
      { id: 'acc-asset', accountCode: '1001', accountName: 'Asset', category: 'ASSET', totalDebit: 10000, totalCredit: 0 },
      { id: 'acc-zero', accountCode: '5001', accountName: 'Zero', category: 'EXPENSE', totalDebit: 500, totalCredit: 500 }
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
    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    await expect(
      ReportService.getProjectLedger('invalid-proj-id')
    ).rejects.toThrow('Project with ID invalid-proj-id not found');
  });

  test('flattens bill line items and correctly calculates total project cost', async () => {
    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
      {
        projectName: 'Wadaan Heights',
        projectPrefix: 'WH',
        lines: [
          {
            billId: 'bill-1',
            lineItemId: 'line-1',
            billDate: '2026-09-15T00:00:00Z',
            vendorName: 'Al-Hadeed Steel Mills',
            invoiceNumber: 'INV-1001',
            description: 'Deformed Grade 60 Steel 10mm',
            quantity: 10,
            unitPrice: 25000,
            lineTotal: 250000
          },
          {
            billId: 'bill-1',
            lineItemId: 'line-2',
            billDate: '2026-09-15T00:00:00Z',
            vendorName: 'Al-Hadeed Steel Mills',
            invoiceNumber: 'INV-1001',
            description: 'Binding Wire 50kg Roll',
            quantity: 2,
            unitPrice: 7500,
            lineTotal: 15000
          },
          {
            billId: 'bill-2',
            lineItemId: 'line-3',
            billDate: '2026-09-18T00:00:00Z',
            vendorName: 'Bestway Cement',
            invoiceNumber: 'INV-1002',
            description: 'OPC Grade 53 Cement 50kg Bags',
            quantity: 100,
            unitPrice: 1450,
            lineTotal: 145000
          }
        ]
      }
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
    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
      {
        billId: 'bill-oh-1',
        invoiceNumber: 'BILL-ELEC-01',
        billDate: new Date('2026-09-10T00:00:00Z'),
        grandTotal: '75000.00',
        paymentStatus: 'PAID',
        vendorName: 'WAPDA Electricity',
      },
      {
        billId: 'bill-oh-2',
        invoiceNumber: 'BILL-OFFICE-RENT',
        billDate: new Date('2026-09-01T00:00:00Z'),
        grandTotal: '150000.00',
        paymentStatus: 'PAID',
        vendorName: 'Property Landlord',
      },
    ]);

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

  test('attributes partner drawings debited against specific partner accounts and handles unprovisioned accounts', async () => {
    mockPrisma.account.findMany.mockResolvedValue([
      {
        id: 'acc-arshad',
        accountCode: '3010-01',
        accountName: 'Arshad Khalil — Drawings & Distributions',
        category: AccountCategory.EQUITY,
      },
    ]);

    mockPrisma.journalLine.findMany.mockResolvedValue([
      {
        id: 'line-draw-1',
        accountId: 'acc-arshad',
        debitAmount: '200000.00',
        memo: 'Cheque #991024 personal withdrawal',
        account: {
          accountCode: '3010-01',
          accountName: 'Arshad Khalil — Drawings & Distributions',
        },
        journal: {
          entryNumber: 'JV-MOD1-002',
          entryDate: new Date('2026-09-08T14:30:00Z'),
          description: 'Owner monthly drawing',
          lines: [
            {
              vendor: { vendorName: 'Ali Hardware' },
              customer: null,
              project: { projectName: 'Wadaan Heights', projectPrefix: 'WH' },
            },
          ],
        },
        vendor: null,
        customer: null,
        project: null,
      },
    ]);

    const result = await ReportService.getEquityLedger();

    // Arshad should have the drawing from 3010-01
    expect(result.arshad.isProvisioned).toBe(true);
    expect(result.arshad.lines).toHaveLength(1);
    expect(result.arshad.lines[0].reference).toBe('JV-MOD1-002');
    expect(result.arshad.lines[0].amount).toBe('200000.00');
    expect(result.arshad.lines[0].partyName).toBe('Ali Hardware (Vendor)');
    expect(result.arshad.lines[0].projectName).toBe('Wadaan Heights (WH)');
    expect(result.arshad.totalDrawings).toBe('200000.00');

    // Zeeshan account 3020 does not exist in DB yet - should gracefully return unprovisioned empty state
    expect(result.zeeshan.isProvisioned).toBe(false);
    expect(result.zeeshan.accountName).toBe('Not Provisioned in Chart of Accounts');
    expect(result.zeeshan.lines).toEqual([]);
    expect(result.zeeshan.totalDrawings).toBe('0.00');

    // Grand total = Arshad (200k) + Zeeshan (0) = 200,000.00
    expect(result.grandTotal).toBe('200000.00');
  });

  test('does NOT attribute general director withdrawals to Arshad Sir, places them in general drawings', async () => {
    mockPrisma.account.findMany.mockResolvedValue([
      {
        id: 'acc-general-drawings',
        accountCode: '3010-01',
        accountName: 'Owner Drawings',
        category: AccountCategory.EQUITY,
      },
    ]);

    mockPrisma.journalLine.findMany.mockResolvedValue([
      {
        id: 'line-draw-jv003',
        accountId: 'acc-general-drawings',
        debitAmount: '100000.00',
        memo: 'Personal withdrawal by director',
        account: {
          accountCode: '3010-01',
          accountName: 'Owner Drawings',
        },
        journal: {
          entryNumber: 'JV-0003',
          entryDate: new Date('2026-09-28T00:00:00Z'),
          description: 'Owner equity withdrawal for personal use',
          lines: [],
        },
        vendor: { vendorName: 'Ali Hardware' },
        customer: null,
        project: null,
      },
    ]);

    const result = await ReportService.getEquityLedger();

    // Arshad should NOT have this drawing because it was not specified for Arshad
    expect(result.arshad.lines).toHaveLength(0);
    expect(result.arshad.totalDrawings).toBe('0.00');

    // General Director Drawings receives the withdrawal
    expect(result.general).toBeDefined();
    expect(result.general?.partnerName).toBe('General Director / Owner Drawings');
    expect(result.general?.lines).toHaveLength(1);
    expect(result.general?.lines[0].reference).toBe('JV-0003');
    expect(result.general?.lines[0].memo).toBe('Personal withdrawal by director');
    expect(result.general?.lines[0].partyName).toBe('Ali Hardware (Vendor)');
    expect(result.general?.totalDrawings).toBe('100000.00');

    expect(result.grandTotal).toBe('100000.00');
  });
});
