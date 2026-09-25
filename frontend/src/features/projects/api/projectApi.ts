import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
import { ProjectItem, CreateProjectPayload, ProjectStatus, ProjectTransactionsResponse } from '../types';

/**
 * Fetches all construction projects with calculated live health metrics.
 */
export const fetchProjects = async (): Promise<ProjectItem[]> => {
  const response = await apiClient.get<ApiResponse<ProjectItem[]>>('/projects');
  return response.data.data!;
};

/**
 * Creates a new construction site project (Screen 4 mutation).
 */
export const createProject = async (payload: CreateProjectPayload): Promise<ProjectItem> => {
  const response = await apiClient.post<ApiResponse<ProjectItem>>('/projects', payload);
  return response.data.data!;
};

/**
 * Fetches a single project by ID.
 */
export const fetchProjectById = async (id: string): Promise<ProjectItem> => {
  const response = await apiClient.get<ApiResponse<ProjectItem>>(`/projects/${id}`);
  return response.data.data!;
};

/**
 * Updates the operational status of a project.
 */
export const updateProjectStatus = async (id: string, status: ProjectStatus): Promise<ProjectItem> => {
  const response = await apiClient.patch<ApiResponse<ProjectItem>>(`/projects/${id}/status`, { status });
  return response.data.data!;
};

/**
 * Fetches all GL transactions / journal lines tagged to this project.
 */
export const fetchProjectTransactions = async (id: string): Promise<ProjectTransactionsResponse> => {
  const response = await apiClient.get<ApiResponse<ProjectTransactionsResponse>>(`/projects/${id}/transactions`);
  return response.data.data!;
};
