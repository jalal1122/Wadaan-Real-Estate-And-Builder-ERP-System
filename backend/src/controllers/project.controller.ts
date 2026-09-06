import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/project.service';
import { CreateProjectSchema, UpdateProjectStatusSchema } from '../utils/validation.util';
import { AppError } from '../middleware/errorHandler';

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = CreateProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const project = await ProjectService.createProject(parseResult.data);

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getAllProjects = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await ProjectService.getAllProjects();

    res.status(200).json({
      success: true,
      data: projects
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const project = await ProjectService.getProjectById(id);

    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    next(error);
  }
};

export const updateProjectStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parseResult = UpdateProjectStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
    }

    const project = await ProjectService.updateProjectStatus(id, parseResult.data);

    res.status(200).json({
      success: true,
      data: project,
      message: 'Project status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
