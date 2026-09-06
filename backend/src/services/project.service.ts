import Decimal from 'decimal.js';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CreateProjectInput, UpdateProjectStatusInput } from '../utils/validation.util';

export class ProjectService {
  /**
   * Initializes a new construction site.
   */
  static async createProject(data: CreateProjectInput) {
    const existing = await prisma.project.findUnique({
      where: { projectPrefix: data.projectPrefix }
    });

    if (existing) {
      throw new AppError(
        `Project with prefix '${data.projectPrefix}' already exists`,
        409,
        'DUPLICATE_PROJECT_PREFIX'
      );
    }

    return await prisma.project.create({
      data: {
        projectName: data.projectName,
        projectPrefix: data.projectPrefix,
        masterBOQ: new Decimal(data.masterBOQ),
        status: 'ACTIVE'
      }
    });
  }

  /**
   * Fetches master grid of projects with calculated live health metrics.
   */
  static async getAllProjects() {
    const projects = await prisma.project.findMany({
      include: {
        expenseBills: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return projects.map((project) => {
      const spentToDate = project.expenseBills.reduce(
        (sum, bill) => sum.plus(new Decimal(bill.grandTotal)),
        new Decimal(0)
      );
      const masterBOQ = new Decimal(project.masterBOQ);
      const budgetVariance = masterBOQ.minus(spentToDate);
      const isOverBudget = spentToDate.gt(masterBOQ);
      const budgetBurnPercentage = masterBOQ.gt(0)
        ? spentToDate.dividedBy(masterBOQ).times(100).toDecimalPlaces(2).toNumber()
        : 0;

      return {
        ...project,
        spentToDate,
        budgetVariance,
        isOverBudget,
        budgetBurnPercentage
      };
    });
  }

  /**
   * Fetches single project detail with associated bills and computed metrics.
   */
  static async getProjectById(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        expenseBills: {
          include: {
            lineItems: true,
            vendor: true
          },
          orderBy: { billDate: 'desc' }
        }
      }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    const spentToDate = project.expenseBills.reduce(
      (sum, bill) => sum.plus(new Decimal(bill.grandTotal)),
      new Decimal(0)
    );
    const masterBOQ = new Decimal(project.masterBOQ);
    const budgetVariance = masterBOQ.minus(spentToDate);
    const isOverBudget = spentToDate.gt(masterBOQ);
    const budgetBurnPercentage = masterBOQ.gt(0)
      ? spentToDate.dividedBy(masterBOQ).times(100).toDecimalPlaces(2).toNumber()
      : 0;

    return {
      ...project,
      spentToDate,
      budgetVariance,
      isOverBudget,
      budgetBurnPercentage
    };
  }

  /**
   * Updates project status (e.g. ACTIVE -> COMPLETED / ON_HOLD).
   */
  static async updateProjectStatus(id: string, input: UpdateProjectStatusInput) {
    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    return await prisma.project.update({
      where: { id },
      data: { status: input.status }
    });
  }
}
