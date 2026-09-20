import { ProjectService } from '../services/project.service';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import Decimal from 'decimal.js';

jest.mock('../config/db', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    journalLine: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('ProjectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    test('1. throws DUPLICATE_PROJECT_PREFIX (409) if project prefix already exists', async () => {
      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'proj-existing',
        projectPrefix: 'WHT',
      });

      await expect(
        ProjectService.createProject({
          projectName: 'Wadaan Heights Tower B',
          projectPrefix: 'WHT',
          masterBOQ: 50000000,
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'DUPLICATE_PROJECT_PREFIX',
      });
    });

    test('2. creates project successfully with status ACTIVE and Decimal masterBOQ', async () => {
      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.project.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'proj-1',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      const result = await ProjectService.createProject({
        projectName: 'Commercial Plaza',
        projectPrefix: 'CPZ',
        masterBOQ: 25000000,
      });

      expect(result.projectName).toBe('Commercial Plaza');
      expect(result.projectPrefix).toBe('CPZ');
      expect(result.status).toBe('ACTIVE');
      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: {
          projectName: 'Commercial Plaza',
          projectPrefix: 'CPZ',
          masterBOQ: new Decimal(25000000),
          status: 'ACTIVE',
        },
      });
    });
  });

  describe('getAllProjects', () => {
    test('3. calculates correct spentToDate, budgetVariance, and budgetBurnPercentage under budget', async () => {
      (mockPrisma.project.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'proj-1',
          projectName: 'WIP Tower',
          projectPrefix: 'WPT',
          masterBOQ: new Decimal(10000000), // 10M BOQ
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          expenseBills: [
            { grandTotal: new Decimal(2000000) },
            { grandTotal: new Decimal(3000000) },
          ],
        },
      ]);

      const projects = await ProjectService.getAllProjects();
      expect(projects).toHaveLength(1);
      const p = projects[0];

      expect(p.spentToDate.toString()).toBe('5000000'); // 2M + 3M = 5M
      expect(p.budgetVariance.toString()).toBe('5000000'); // 10M - 5M = 5M
      expect(p.isOverBudget).toBe(false);
      expect(p.budgetBurnPercentage).toBe(50); // 50.0%
    });

    test('4. correctly flags isOverBudget=true when totalSpent > masterBOQ', async () => {
      (mockPrisma.project.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'proj-over',
          projectName: 'Overrun Site',
          projectPrefix: 'OVR',
          masterBOQ: new Decimal(5000000), // 5M BOQ
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          expenseBills: [
            { grandTotal: new Decimal(4000000) },
            { grandTotal: new Decimal(2500000) }, // Total spent = 6.5M
          ],
        },
      ]);

      const projects = await ProjectService.getAllProjects();
      const p = projects[0];

      expect(p.spentToDate.toString()).toBe('6500000');
      expect(p.isOverBudget).toBe(true);
      expect(p.budgetBurnPercentage).toBe(130);
    });

    test('5. handles masterBOQ = 0 gracefully without division by zero', async () => {
      (mockPrisma.project.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'proj-zero',
          projectName: 'Zero Budget Project',
          projectPrefix: 'ZBP',
          masterBOQ: new Decimal(0),
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          expenseBills: [],
        },
      ]);

      const projects = await ProjectService.getAllProjects();
      const p = projects[0];

      expect(p.budgetBurnPercentage).toBe(0);
      expect(p.isOverBudget).toBe(false);
    });
  });

  describe('getProjectById', () => {
    test('6. throws PROJECT_NOT_FOUND (404) when project does not exist', async () => {
      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ProjectService.getProjectById('non-existent-id')).rejects.toMatchObject({
        statusCode: 404,
        code: 'PROJECT_NOT_FOUND',
      });
    });
  });

  describe('getProjectTransactions', () => {
    test('7. throws PROJECT_NOT_FOUND (404) if project does not exist', async () => {
      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ProjectService.getProjectTransactions('invalid-project')).rejects.toMatchObject({
        statusCode: 404,
        code: 'PROJECT_NOT_FOUND',
      });
    });

    test('8. returns journal transactions with correct running balance and totals', async () => {
      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'proj-1',
        projectName: 'Wadaan Heights',
        projectPrefix: 'WH',
        status: 'ACTIVE',
        masterBOQ: new Decimal(5000000),
        createdAt: new Date('2026-01-01'),
      });

      (mockPrisma.journalLine.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'line-1',
          journalId: 'jv-1',
          debitAmount: new Decimal(200000),
          creditAmount: new Decimal(0),
          memo: 'Cement purchase',
          journal: {
            id: 'jv-1',
            entryNumber: 'JV-0001',
            entryDate: new Date('2026-01-05'),
            description: 'Expense for Project: Wadaan Heights',
          },
          account: {
            id: 'acc-1200',
            accountCode: '1200',
            accountName: 'Work In Progress',
            category: 'ASSET',
          },
          vendor: {
            id: 'vend-1',
            vendorName: 'Lucky Cement',
          },
          customer: null,
        },
        {
          id: 'line-2',
          journalId: 'jv-2',
          debitAmount: new Decimal(50000),
          creditAmount: new Decimal(0),
          memo: 'Steel purchase',
          journal: {
            id: 'jv-2',
            entryNumber: 'JV-0002',
            entryDate: new Date('2026-01-10'),
            description: 'Expense for Project: Wadaan Heights',
          },
          account: {
            id: 'acc-1200',
            accountCode: '1200',
            accountName: 'Work In Progress',
            category: 'ASSET',
          },
          vendor: {
            id: 'vend-2',
            vendorName: 'Mughal Steel',
          },
          customer: null,
        },
      ]);

      const result = await ProjectService.getProjectTransactions('proj-1');

      expect(result.project.projectName).toBe('Wadaan Heights');
      expect(result.transactions).toHaveLength(2);
      expect(result.totalDebit.toString()).toBe('250000');
      expect(result.totalCredit.toString()).toBe('0');
      expect(result.netBalance.toString()).toBe('250000');

      // Check running balance on transactions
      expect(result.transactions[0].runningBalance.toString()).toBe('200000');
      expect(result.transactions[0].entryNumber).toBe('JV-0001');
      expect(result.transactions[0].partyName).toBe('Lucky Cement');

      expect(result.transactions[1].runningBalance.toString()).toBe('250000');
      expect(result.transactions[1].entryNumber).toBe('JV-0002');
      expect(result.transactions[1].partyName).toBe('Mughal Steel');
    });
  });
});
