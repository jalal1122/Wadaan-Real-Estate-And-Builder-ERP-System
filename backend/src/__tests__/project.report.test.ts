import { ProjectService } from '../services/project.service';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import Decimal from 'decimal.js';

jest.mock('../config/db', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
    },
    journalLine: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('ProjectService.getProjectReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. throws PROJECT_NOT_FOUND (404) if project id does not exist', async () => {
    (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(ProjectService.getProjectReport('non-existent-id')).rejects.toMatchObject({
      statusCode: 404,
      code: 'PROJECT_NOT_FOUND',
    });
  });

  test('2. returns correct grandTotalFromClients summing across all deals and invoices', async () => {
    const mockProject = {
      id: 'proj-1',
      projectName: 'Wadaan Heights',
      projectPrefix: 'WH',
      status: 'ACTIVE',
      masterBOQ: new Decimal(10000000),
      createdAt: new Date('2026-01-01'),
      expenseBills: [],
      journalLines: [
        {
          id: 'jl-1',
          debitAmount: new Decimal(2000000),
          creditAmount: new Decimal(0),
          memo: 'WIP foundation materials',
          journal: {
            id: 'j-1',
            entryNumber: 'JV-0001',
            entryDate: new Date('2026-01-10'),
            description: 'Foundation expense',
          },
          account: {
            id: 'acc-1',
            accountCode: '1200',
            accountName: 'Work In Progress (WIP)',
            category: 'ASSET',
          },
          vendor: null,
          customer: null,
        },
      ],
      deals: [
        {
          id: 'deal-1',
          customerId: 'cust-1',
          dealType: 'CONSTRUCTION',
          totalValue: new Decimal(8000000),
          customer: {
            fullName: 'Arshad Sir',
            phone: '0300-1111111',
          },
          invoices: [
            {
              id: 'inv-1',
              description: 'Token Payment',
              amount: new Decimal(1000000),
              paidAmount: new Decimal(1000000),
              dueDate: new Date('2026-01-15'),
              paymentStatus: 'PAID',
              receipt: {
                receiptDate: new Date('2026-01-15'),
                paymentMethod: 'CASH',
                bankRefNumber: null,
                customer: { fullName: 'Arshad Sir' },
              },
            },
            {
              id: 'inv-2',
              description: 'Foundation Milestone',
              amount: new Decimal(2000000),
              paidAmount: new Decimal(2000000),
              dueDate: new Date('2026-03-01'),
              paymentStatus: 'PAID',
              receipt: {
                receiptDate: new Date('2026-03-01'),
                paymentMethod: 'CHEQUE',
                bankRefNumber: 'CHQ-8821',
                customer: { fullName: 'Zeeshan Sir' }, // Co-client paying!
              },
            },
          ],
        },
        {
          id: 'deal-2',
          customerId: 'cust-2',
          dealType: 'SALE',
          totalValue: new Decimal(5000000),
          customer: {
            fullName: 'Kamran Ali',
            phone: '0300-2222222',
          },
          invoices: [
            {
              id: 'inv-3',
              description: 'Booking Advance',
              amount: new Decimal(1000000),
              paidAmount: new Decimal(1000000),
              dueDate: new Date('2026-02-01'),
              paymentStatus: 'PAID',
              receipt: {
                receiptDate: new Date('2026-02-01'),
                paymentMethod: 'ONLINE',
                bankRefNumber: 'TXN-9912',
                customer: { fullName: 'Kamran Ali' },
              },
            },
          ],
        },
      ],
    };

    (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

    const report = await ProjectService.getProjectReport('proj-1');

    // Total received = 1M + 2M + 1M = 4M
    expect(report.grandTotalFromClients.toString()).toBe('4000000');
    expect(report.summary.totalReceivedFromClients.toString()).toBe('4000000');
    expect(report.summary.totalSpentWIP.toString()).toBe('2000000');
    expect(report.summary.netCashMargin.toString()).toBe('2000000'); // 4M - 2M = 2M
    expect(report.clientReceipts).toHaveLength(2);
  });

  test('3. correctly shows paidByCustomerName from receipt.customer for co-client payments', async () => {
    const mockProject = {
      id: 'proj-1',
      projectName: 'Wadaan Heights',
      projectPrefix: 'WH',
      status: 'ACTIVE',
      masterBOQ: new Decimal(10000000),
      createdAt: new Date('2026-01-01'),
      expenseBills: [],
      journalLines: [],
      deals: [
        {
          id: 'deal-1',
          customerId: 'cust-1',
          dealType: 'CONSTRUCTION',
          totalValue: new Decimal(8000000),
          customer: {
            fullName: 'Primary Client Arshad',
            phone: '0300-1111111',
          },
          invoices: [
            {
              id: 'inv-1',
              description: 'Milestone 1',
              amount: new Decimal(2000000),
              paidAmount: new Decimal(2000000),
              dueDate: new Date('2026-02-01'),
              paymentStatus: 'PAID',
              receipt: {
                receiptDate: new Date('2026-02-02'),
                paymentMethod: 'CHEQUE',
                bankRefNumber: 'CHQ-555',
                customer: { fullName: 'Co-Client Zeeshan' },
              },
            },
          ],
        },
      ],
    };

    (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

    const report = await ProjectService.getProjectReport('proj-1');
    const payment = report.clientReceipts[0].payments[0];

    expect(payment.paidByCustomerName).toBe('Co-Client Zeeshan');
    expect(report.clientReceipts[0].customerName).toBe('Primary Client Arshad');
  });

  test('4. returns correct grandTotalToVendors and groups bills by vendor', async () => {
    const mockProject = {
      id: 'proj-1',
      projectName: 'Wadaan Heights',
      projectPrefix: 'WH',
      status: 'ACTIVE',
      masterBOQ: new Decimal(10000000),
      createdAt: new Date('2026-01-01'),
      journalLines: [],
      deals: [],
      expenseBills: [
        {
          id: 'bill-1',
          vendorId: 'vend-1',
          invoiceNumber: 'INV-101',
          billDate: new Date('2026-01-10'),
          grandTotal: new Decimal(500000),
          pendingAmount: new Decimal(0),
          paymentStatus: 'PAID',
          vendor: {
            id: 'vend-1',
            vendorName: 'Ali Hardware',
            phone: '0300-3333333',
          },
          lineItems: [
            {
              description: 'Cement Bags',
              quantity: 200,
              unitPrice: new Decimal(1500),
              lineTotal: new Decimal(300000),
            },
            {
              description: 'Steel Rebar',
              quantity: 50,
              unitPrice: new Decimal(4000),
              lineTotal: new Decimal(200000),
            },
          ],
        },
        {
          id: 'bill-2',
          vendorId: 'vend-1',
          invoiceNumber: 'INV-102',
          billDate: new Date('2026-02-15'),
          grandTotal: new Decimal(750000),
          pendingAmount: new Decimal(250000),
          paymentStatus: 'PARTIAL',
          vendor: {
            id: 'vend-1',
            vendorName: 'Ali Hardware',
            phone: '0300-3333333',
          },
          lineItems: [],
        },
        {
          id: 'bill-3',
          vendorId: 'vend-2',
          invoiceNumber: 'ST-001',
          billDate: new Date('2026-03-01'),
          grandTotal: new Decimal(1250000),
          pendingAmount: new Decimal(1250000),
          paymentStatus: 'UNPAID',
          vendor: {
            id: 'vend-2',
            vendorName: 'Steel Traders',
            phone: '0300-4444444',
          },
          lineItems: [],
        },
      ],
    };

    (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

    const report = await ProjectService.getProjectReport('proj-1');

    // Total to vendors: 500k + 750k + 1.25M = 2.5M
    expect(report.grandTotalToVendors.toString()).toBe('2500000');
    expect(report.vendorExpenses).toHaveLength(2);

    const aliHardware = report.vendorExpenses.find((v) => v.vendorId === 'vend-1');
    expect(aliHardware).toBeDefined();
    expect(aliHardware?.bills).toHaveLength(2);
    expect(aliHardware?.totalBilled.toString()).toBe('1250000');
    expect(aliHardware?.totalPaid.toString()).toBe('1000000'); // (500k - 0) + (750k - 250k) = 1M
    expect(aliHardware?.totalPending.toString()).toBe('250000');

    const steelTraders = report.vendorExpenses.find((v) => v.vendorId === 'vend-2');
    expect(steelTraders).toBeDefined();
    expect(steelTraders?.totalBilled.toString()).toBe('1250000');
    expect(steelTraders?.totalPaid.toString()).toBe('0');
    expect(steelTraders?.totalPending.toString()).toBe('1250000');
  });

  test('5. returns empty arrays for clientReceipts, vendorExpenses and glTransactions when project is empty', async () => {
    const mockEmptyProject = {
      id: 'proj-empty',
      projectName: 'Empty Project',
      projectPrefix: 'EMP',
      status: 'ACTIVE',
      masterBOQ: new Decimal(5000000),
      createdAt: new Date('2026-01-01'),
      expenseBills: [],
      deals: [],
      journalLines: [],
    };

    (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(mockEmptyProject);

    const report = await ProjectService.getProjectReport('proj-empty');

    expect(report.clientReceipts).toHaveLength(0);
    expect(report.vendorExpenses).toHaveLength(0);
    expect(report.glTransactions).toHaveLength(0);
    expect(report.grandTotalFromClients.toString()).toBe('0');
    expect(report.grandTotalToVendors.toString()).toBe('0');
    expect(report.summary.totalSpentWIP.toString()).toBe('0');
    expect(report.summary.totalReceivedFromClients.toString()).toBe('0');
    expect(report.summary.budgetVariance.toString()).toBe('5000000');
    expect(report.summary.isOverBudget).toBe(false);
  });
});
