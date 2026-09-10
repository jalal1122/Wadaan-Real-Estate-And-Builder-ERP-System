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
});
